const sqlite3 = require('sqlite3').verbose();

// Abre la base de datos RH.db
let db = new sqlite3.Database('./RH.db', (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
    return;
  }
  console.log('Conectado a la base de datos RH.db');
});

// Agregar la columna 'papelera' a la tabla 'proyectos'
db.run(`ALTER TABLE proyectos
         ADD COLUMN papelera INTEGER DEFAULT 0`, (err) => {
  if (err) {
    console.error('Error al agregar la columna:', err.message);
    return;
  }
  console.log('Columna "papelera" agregada con éxito');
});

// Cerrar la base de datos
db.close((err) => {
  if (err) {
    console.error('Error al cerrar la base de datos:', err.message);
    return;
  }
  console.log('Conexión a la base de datos cerrada');
});
