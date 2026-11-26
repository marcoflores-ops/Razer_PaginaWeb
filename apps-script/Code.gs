const SPREADSHEET_ID = '1bKJb2dRJhHfplCugM9T_btd3h0QKk8vyk3l5SrtdFE4';
const SHEET_ID = 0;
const DEFAULT_HEADERS = ['Fecha', 'Nombre', 'Celular', 'Correo electrónico', 'Producto de interés'];
const REQUIRED_FIELDS = ['nombre', 'celular', 'correo', 'producto'];
const HEADER_NAMES = {
  fecha: ['fecha', 'fecha de registro', 'fecha y hora', 'marca temporal', 'timestamp', 'date'],
  nombre: ['nombre', 'nombres', 'nombre completo', 'nombre y apellido', 'nombre y apellidos', 'name'],
  celular: ['celular', 'telefono', 'telefono celular', 'numero de celular', 'numero de telefono', 'movil', 'phone'],
  correo: ['correo', 'correo electronico', 'direccion de correo electronico', 'email', 'e-mail'],
  producto: ['producto', 'producto de interes', 'productos de interes', 'product']
};

function doPost(event) {
  let registration;
  try {
    registration = parseRegistration(event);
  } catch (error) {
    return json({ result: 'error', message: error.message });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return json({ result: 'error', message: 'El registro está ocupado. Inténtalo de nuevo.' });
  }

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(SHEET_ID);
    if (!sheet) throw new Error('No se encontró la pestaña configurada.');

    const empty = sheet.getLastRow() === 0;
    const headers = empty ? DEFAULT_HEADERS : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const columns = mapColumns(headers);
    if (empty) sheet.appendRow(headers);

    const row = headers.map(() => '');
    if (columns.fecha !== undefined) row[columns.fecha] = new Date();
    REQUIRED_FIELDS.forEach(field => {
      const value = registration[field];
      row[columns[field]] = field === 'celular' || /^[=+@'-]/.test(value) ? "'" + value : value;
    });
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return json({ result: 'success' });
  } catch (error) {
    console.error('Registro Razer: ' + error.message);
    return json({ result: 'error', message: 'No se pudo guardar el registro.' });
  } finally {
    lock.releaseLock();
  }
}

function parseRegistration(event) {
  const contents = event && event.postData && event.postData.contents;
  if (typeof contents !== 'string' || contents.length > 2500) {
    throw new Error('La solicitud de registro no es válida.');
  }
  let data;
  try {
    data = JSON.parse(contents);
  } catch {
    throw new Error('La solicitud de registro no es válida.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('La solicitud de registro no es válida.');
  }

  const value = key => typeof data[key] === 'string' ? data[key].trim() : '';
  const registration = {
    nombre: value('nombre'),
    celular: value('celular'),
    correo: value('correo'),
    producto: value('producto') || 'Sin seleccionar'
  };
  if (!registration.nombre || registration.nombre.length > 150 ||
      !registration.celular || registration.celular.length > 40 ||
      registration.correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.correo) ||
      registration.producto.length > 120) {
    throw new Error('Revisa los datos del registro.');
  }
  return registration;
}

function mapColumns(headers) {
  const names = headers.map(header => header.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' '));
  const columns = {};
  Object.entries(HEADER_NAMES).forEach(([field, aliases]) => {
    const matches = names.map((name, index) => aliases.includes(name) ? index : -1).filter(index => index >= 0);
    if (matches.length > 1) throw new Error('Encabezado ambiguo: ' + field);
    if (matches.length === 1) columns[field] = matches[0];
  });
  if (REQUIRED_FIELDS.some(field => columns[field] === undefined)) {
    throw new Error('Falta algún encabezado en la primera fila: nombre, celular, correo o producto.');
  }
  return columns;
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
