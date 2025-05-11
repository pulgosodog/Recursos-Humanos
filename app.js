const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false
}));

// Base de datos SQLite
const db = new sqlite3.Database('./usuarios.db');

// Crear tabla usuarios si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE,
    contrasena TEXT
  )
`);

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Rutas

app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
  
});
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body;

  db.get('SELECT * FROM usuarios WHERE usuario = ?', [usuario], async (err, user) => {
    if (!user) {
      return res.render('login', { error: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(contrasena, user.contrasena);
    if (valid) {
      req.session.user = { id: user.id, usuario: user.usuario };
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: 'Contraseña incorrecta' });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireLogin, (req, res) => { 
  res.render('dashboard', {
    titulo: 'Dashboard',
    usuario: req.session.user.usuario
  });
}
);

app.get('/proyectos', requireLogin, (req, res) => {
  res.render('proyects', {
    titulo: 'Dashboard de Proyectos'
  });
});

app.get('/proyectos/editar/:id', (req, res) => {
  console.log("Targeteando ruta editar")
  const { id } = req.params;

  // Simulación de datos desde la base de datos
  const proyecto = {
    id,
    nombre: 'Proyecto X',
    descripcion: 'Descripción actual',
    presupuesto: 1500,
    fecha_entrega: '2025-05-30',
    empleados_asignados: [1, 3] // ids
  };

  const empleados = [
    { id: 1, nombre: 'Ana Pérez' },
    { id: 2, nombre: 'Luis Gómez' },
    { id: 3, nombre: 'Carla Díaz' }
  ];

  const historial = [
    { fecha: '2025-05-10', cambio: 'Se cambió la fecha de entrega' },
    { fecha: '2025-04-20', cambio: 'Se actualizó el presupuesto' }
  ];

  res.render('edit-proyect', { proyecto, empleados, historial });
});

app.post('/editar-proyecto/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, presupuesto, fecha_entrega, empleados } = req.body;

  // Aquí iría la lógica para actualizar en SQLite
  console.log('Proyecto actualizado:', {
    id,
    nombre,
    descripcion,
    presupuesto,
    fecha_entrega,
    empleados: Array.isArray(empleados) ? empleados : [empleados]
  });

  // Redirecciona de vuelta al dashboard o vista del proyecto
  res.redirect('/proyectos');
});


app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});

// Crear un usuario manual (una sola vez)
const crearUsuarioInicial = async () => {
  const usuario = 'admin';
  const contrasenaPlano = '1234';
  const hash = await bcrypt.hash(contrasenaPlano, 10);

  db.get('SELECT * FROM usuarios WHERE usuario = ?', [usuario], (err, row) => {
    if (!row) {
      db.run('INSERT INTO usuarios (usuario, contrasena) VALUES (?, ?)', [usuario, hash]);
      console.log('Usuario admin creado con contraseña 1234');
    }
  });
};

crearUsuarioInicial();