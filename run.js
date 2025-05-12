const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conexión a la base de datos RH.db
const dbPath = path.join(__dirname, 'RH.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos RH.db');
  }
});

// Cambiar el nombre del atributo requerimiento a rendimiento en la tabla rendimiento
const alterQuery = `
  PRAGMA foreign_keys = OFF;
  CREATE TABLE rendimiento_new AS SELECT id_empleado, nombre_emp, metrica_emp, asist_emp, requerimiento AS rendimiento FROM rendimiento;
  DROP TABLE rendimiento;
  ALTER TABLE rendimiento_new RENAME TO rendimiento;
  PRAGMA foreign_keys = ON;
`;

db.exec(alterQuery, (err) => {
  if (err) {
    console.error('Error al cambiar el nombre del atributo requerimiento a rendimiento:', err.message);
  } else {
    console.log('Nombre del atributo cambiado correctamente a rendimiento');
  }
});

// Insertar datos de la tabla empleados a la tabla rendimiento con el atributo rendimiento en 0
const query = `
  INSERT INTO rendimiento (id_empleado, nombre_emp, metrica_emp, asist_emp, rendimiento)
  SELECT id, nombre, metricas, asistencia, '0'
  FROM empleados
`;

db.run(query, (err) => {
  if (err) {
    console.error('Error al insertar datos en la tabla rendimiento:', err.message);
  } else {
    console.log('Datos insertados correctamente en la tabla rendimiento');
  }
});

// Cerrar la conexión
db.close((err) => {
  if (err) {
    console.error('Error al cerrar la conexión con la base de datos:', err.message);
  } else {
    console.log('Conexión con la base de datos cerrada');
  }
});
