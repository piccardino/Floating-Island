const fs = require('fs');

const template = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Edificio {{NUM}}</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body class="detail-page">
    <main class="detail-content">
      <a class="back-link" href="/">Torna all'isola</a>
      <h1>Edificio {{NUM}}</h1>
      <p>Pagina dedicata al {{ORD}} edificio dell'isola.</p>
    </main>
  </body>
</html>
`;

const ordinals = {
  5: 'quinto',
  6: 'sesto',
  7: 'settimo',
  8: 'ottavo',
  9: 'nono'
};

for (let i = 5; i <= 9; i++) {
  const content = template.replace(/{{NUM}}/g, i).replace(/{{ORD}}/g, ordinals[i]);
  fs.writeFileSync(\`edifici/edificio-\${i}.html\`, content);
}
console.log('Files created.');
