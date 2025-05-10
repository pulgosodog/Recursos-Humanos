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
  res.send(`Hola, ${req.session.user.usuario}. <a href="/logout">Salir</a>`);
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