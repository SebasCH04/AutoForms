const readline = require('node:readline/promises');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const DEFAULT_CONFIG = 'config/microsoft-forms.example.json';
const DEFAULT_POLL_MS = 1000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

async function main() {
  const args = parseArgs_(process.argv.slice(2), process.env);
  const configPath = args.config || DEFAULT_CONFIG;
  const formKey = args.form;
  const waitForOpen = Boolean(args.wait);
  const shouldSubmit = Boolean(args.submit);
  const headless = Boolean(args.headless);
  const pollMs = Number(args.pollMs || args['poll-ms'] || DEFAULT_POLL_MS);
  const timeoutMs = Number(args.timeoutMs || args['timeout-ms'] || DEFAULT_TIMEOUT_MS);

  if (!formKey) {
    throw new Error('Falta --form. Ejemplo: npm run microsoft-form -- --form piscina');
  }

  const config = requireJson_(configPath);
  const formConfig = (config.forms || []).find((form) => form.key === formKey);
  if (!formConfig) {
    throw new Error(`No existe el form "${formKey}" en ${configPath}.`);
  }

  validateMicrosoftFormsUrl_(formConfig.url);

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    await openForm_(page, formConfig.url);

    if (waitForOpen) {
      await waitUntilFormAcceptsResponses_(page, formConfig, pollMs, timeoutMs);
    }

    await fillAnswers_(page, formConfig.answers || []);

    if (shouldSubmit) {
      await submitForm_(page);
      console.log('Formulario enviado.');
      return;
    }

    await scrollSubmitButtonIntoView_(page);
    console.log('Formulario rellenado. Revisa los campos y envia manualmente desde la ventana.');
    console.log('Presiona Enter aqui para cerrar Chromium cuando termines.');
    await waitForEnter_();
  } finally {
    await browser.close();
  }
}

async function openForm_(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

async function waitUntilFormAcceptsResponses_(page, formConfig, pollMs, timeoutMs) {
  const startedAt = Date.now();
  let attempt = 1;

  while (Date.now() - startedAt < timeoutMs) {
    if (await pageLooksFillable_(page, formConfig.answers || [])) {
      console.log(`Formulario disponible despues de ${attempt} intento(s).`);
      return;
    }

    const bodyText = normalize_(await page.locator('body').innerText().catch(() => ''));
    console.log(`Aun no disponible. Intento ${attempt}. ${shortStatus_(bodyText)}`);
    await page.waitForTimeout(pollMs);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    attempt += 1;
  }

  throw new Error(`El formulario no estuvo disponible antes de ${timeoutMs} ms.`);
}

async function pageLooksFillable_(page, answers) {
  if (answers.length === 0) {
    return (await questionContainers_(page).count()) > 0;
  }

  const firstAnswer = answers[0];
  try {
    await findQuestion_(page, firstAnswer.title, 1000);
    return true;
  } catch (error) {
    return false;
  }
}

async function fillAnswers_(page, answers) {
  for (const answer of answers) {
    await answerQuestion_(page, answer);
  }
}

async function answerQuestion_(page, answer) {
  const question = await findQuestion_(page, answer.title, 5000);
  const type = String(answer.type || 'text').toLowerCase();

  switch (type) {
    case 'text':
    case 'short':
    case 'email':
    case 'number':
      await fillTextbox_(question, answer.value);
      return;

    case 'paragraph':
    case 'textarea':
      await fillTextbox_(question, answer.value);
      return;

    case 'radio':
    case 'choice':
    case 'multiple_choice':
    case 'scale':
    case 'linear_scale':
      await chooseOption_(question, answer.value, 'radio');
      return;

    case 'checkbox':
    case 'checkboxes':
      await chooseCheckboxes_(question, answer.value);
      return;

    case 'dropdown':
    case 'select':
      await chooseDropdown_(page, question, answer.value);
      return;

    default:
      throw new Error(`Tipo no soportado para "${answer.title}": ${answer.type}`);
  }
}

async function findQuestion_(page, title, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const normalizedTitle = normalize_(title);

  while (Date.now() < deadline) {
    const questions = questionContainers_(page);
    const count = await questions.count();

    for (let index = 0; index < count; index += 1) {
      const question = questions.nth(index);
      const text = normalize_(await question.innerText().catch(() => ''));
      if (text.includes(normalizedTitle)) {
        return question;
      }
    }

    await page.waitForTimeout(150);
  }

  throw new Error(`No encontre la pregunta "${title}". Revisa que el titulo sea exacto.`);
}

function questionContainers_(page) {
  return page.locator([
    '[data-automation-id="questionItem"]',
    '[data-automation-id="questionContent"]',
    '[role="group"]'
  ].join(', '));
}

async function fillTextbox_(question, value) {
  const textbox = question.getByRole('textbox').first();
  await textbox.waitFor({ state: 'visible', timeout: 5000 });
  await textbox.fill(String(value));
}

async function chooseOption_(question, value, role) {
  const exact = question.getByRole(role, { name: String(value), exact: true }).first();
  if (await exact.count()) {
    await exact.waitFor({ state: 'visible', timeout: 5000 });
    await exact.click();
    return;
  }

  const loose = question.getByRole(role, { name: new RegExp(`^\\s*${toFlexibleWhitespacePattern_(String(value))}\\s*$`, 'i') }).first();
  await loose.waitFor({ state: 'visible', timeout: 5000 });
  await loose.click();
}

async function chooseCheckboxes_(question, value) {
  const values = Array.isArray(value) ? value : String(value).split(',').map((item) => item.trim()).filter(Boolean);

  for (const optionValue of values) {
    await chooseOption_(question, optionValue, 'checkbox');
  }
}

async function chooseDropdown_(page, question, value) {
  const combobox = question.getByRole('combobox').first();
  await combobox.waitFor({ state: 'visible', timeout: 5000 });
  await combobox.click();

  const option = page.getByRole('option', { name: String(value), exact: true }).first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
}

async function scrollSubmitButtonIntoView_(page) {
  const submitButton = page.getByRole('button', { name: /submit|enviar/i }).first();
  if (await submitButton.count()) {
    await submitButton.scrollIntoViewIfNeeded().catch(() => undefined);
  }
}

async function submitForm_(page) {
  const submitButton = page.getByRole('button', { name: /submit|enviar/i }).first();
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await submitButton.scrollIntoViewIfNeeded().catch(() => undefined);
  await submitButton.click();
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(500);

  const bodyText = normalize_(await page.locator('body').innerText().catch(() => ''));
  const looksSubmitted = [
    'thank you',
    'thanks',
    'your response was submitted',
    'response submitted',
    'gracias',
    'se envio',
    'se ha enviado',
    'respuesta enviada'
  ].some((text) => bodyText.includes(text));

  if (!looksSubmitted) {
    console.log('No pude confirmar el mensaje final, pero el boton de envio fue presionado.');
  }
}

function parseArgs_(argv, env) {
  const args = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }

  if (!args.config && positional[0]) {
    args.config = positional[0];
  }

  if (!args.form && positional[1]) {
    args.form = positional[1];
  }

  applyNpmConfigFallbacks_(args, env);
  return args;
}

function applyNpmConfigFallbacks_(args, env) {
  if (!args.config && env.npm_config_config) {
    args.config = env.npm_config_config;
  }

  if (!args.form && env.npm_config_form) {
    args.form = env.npm_config_form;
  }

  if (args.wait === undefined && isEnabledNpmFlag_(env.npm_config_wait)) {
    args.wait = true;
  }

  if (args.submit === undefined && isEnabledNpmFlag_(env.npm_config_submit)) {
    args.submit = true;
  }

  if (args.headless === undefined && isEnabledNpmFlag_(env.npm_config_headless)) {
    args.headless = true;
  }
}

function isEnabledNpmFlag_(value) {
  if (value === undefined) {
    return false;
  }

  return !['false', '0', 'no'].includes(String(value).toLowerCase());
}

function validateMicrosoftFormsUrl_(url) {
  const text = String(url || '').toLowerCase();
  const allowedHosts = [
    'forms.office.com',
    'forms.microsoft.com',
    'forms.cloud.microsoft'
  ];

  if (!allowedHosts.some((host) => text.includes(host))) {
    throw new Error('Este runner espera un link publico de Microsoft Forms.');
  }
}

function requireJson_(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function shortStatus_(bodyText) {
  if (!bodyText) {
    return '';
  }

  return bodyText.slice(0, 120);
}

function normalize_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function escapeRegExp_(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toFlexibleWhitespacePattern_(value) {
  return value
    .trim()
    .split(/\s+/)
    .map(escapeRegExp_)
    .join('\\s+');
}

async function waitForEnter_() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    await rl.question('');
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
