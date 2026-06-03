const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { chromium } = require('playwright');

const STATE_FILE = path.join(process.cwd(), 'data', 'public-form-submissions.json');

async function main() {
  const args = parseArgs_(process.argv.slice(2), process.env);
  const configPath = args.config || 'config/public-forms.example.json';
  const formKey = args.form;
  const shouldSubmit = Boolean(args.submit);
  const headless = Boolean(args.headless);

  if (!formKey) {
    throw new Error('Falta --form. Ejemplo: npm run public-form -- --form mi_formulario');
  }

  const config = readJson_(configPath);
  const formConfig = (config.forms || []).find((form) => form.key === formKey);
  if (!formConfig) {
    throw new Error(`No existe el form "${formKey}" en ${configPath}.`);
  }

  validatePublicFormUrl_(formConfig.url);

  const state = readState_();
  const fingerprint = buildFingerprint_(formConfig);
  if (formConfig.once !== false && state.submissions[fingerprint]?.status === 'SENT') {
    console.log(`Ya fue enviado una vez: ${formConfig.key}`);
    console.log(`Fecha: ${state.submissions[fingerprint].submittedAt}`);
    return;
  }

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    await page.goto(formConfig.url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    for (const answer of formConfig.answers || []) {
      await answerQuestion_(page, answer);
    }

    if (shouldSubmit) {
      await submitForm_(page);
      state.submissions[fingerprint] = {
        key: formConfig.key,
        url: formConfig.url,
        status: 'SENT',
        submittedAt: new Date().toISOString()
      };
      writeState_(state);
      console.log(`Enviado correctamente: ${formConfig.key}`);
    } else {
      console.log('Formulario rellenado. No se envio porque falta --submit.');
      console.log('Revisa la ventana del navegador. Presiona Enter aqui para cerrarla.');
      await waitForEnter_();
    }
  } catch (error) {
    state.submissions[fingerprint] = {
      key: formConfig.key,
      url: formConfig.url,
      status: 'ERROR',
      error: error.message,
      submittedAt: new Date().toISOString()
    };
    writeState_(state);
    throw error;
  } finally {
    await browser.close();
  }
}

async function answerQuestion_(page, answer) {
  const question = await findQuestion_(page, answer.title);
  const type = String(answer.type || 'text').toLowerCase();

  switch (type) {
    case 'text':
    case 'short':
    case 'email':
    case 'number':
      await fillText_(question, answer.value);
      return;

    case 'paragraph':
    case 'textarea':
      await fillParagraph_(question, answer.value);
      return;

    case 'radio':
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

async function findQuestion_(page, title) {
  const questions = page.locator('div[role="listitem"]');
  const count = await questions.count();
  const normalizedTitle = normalize_(title);

  for (let index = 0; index < count; index += 1) {
    const question = questions.nth(index);
    const text = normalize_(await question.innerText().catch(() => ''));
    if (text.includes(normalizedTitle)) {
      return question;
    }
  }

  throw new Error(`No encontre la pregunta "${title}". Revisa que el titulo sea exacto.`);
}

async function fillText_(question, value) {
  const input = question.locator('input[type="text"], input[type="email"], input[type="number"]').first();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill(String(value));
}

async function fillParagraph_(question, value) {
  const textarea = question.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  await textarea.fill(String(value));
}

async function chooseOption_(question, value, role) {
  const option = question.getByRole(role, { name: String(value), exact: true }).first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
}

async function chooseCheckboxes_(question, value) {
  const values = Array.isArray(value) ? value : String(value).split(',').map((item) => item.trim()).filter(Boolean);

  for (const optionValue of values) {
    await chooseOption_(question, optionValue, 'checkbox');
  }
}

async function chooseDropdown_(page, question, value) {
  const dropdown = question.getByRole('listbox').first();
  await dropdown.waitFor({ state: 'visible', timeout: 5000 });
  await dropdown.click();

  const option = page.getByRole('option', { name: String(value), exact: true }).first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
}

async function submitForm_(page) {
  const submitButton = page.getByRole('button', { name: /submit|enviar/i }).first();
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  await submitButton.click();
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const bodyText = normalize_(await page.locator('body').innerText().catch(() => ''));
  if (!bodyText.includes('your response has been recorded') && !bodyText.includes('se registro tu respuesta')) {
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

function validatePublicFormUrl_(url) {
  const text = String(url || '');
  if (!text.includes('/forms/d/e/') || !text.includes('/viewform')) {
    throw new Error('Este runner espera un link publico de respuesta: /forms/d/e/.../viewform.');
  }
}

function buildFingerprint_(formConfig) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      key: formConfig.key,
      url: formConfig.url,
      answers: formConfig.answers || []
    }))
    .digest('hex');
}

function readState_() {
  if (!fs.existsSync(STATE_FILE)) {
    return { submissions: {} };
  }

  return readJson_(STATE_FILE);
}

function writeState_(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function readJson_(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function normalize_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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
