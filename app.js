
const express = require('express');
const app = express();
const PORT = 3000;


app.set('view engine', 'ejs');


app.use(express.static('public'));


app.get('/', (req, res) => {
  res.render('main', { name: 'Gabriel' }); 
});

app.listen(PORT, () => {
  console.log(`Corriendo en http://localhost:${PORT}`)});
