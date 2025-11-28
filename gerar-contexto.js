const fs = require('fs');
const path = require('path');

// Pastas e arquivos para ignorar
const IGNORE_LIST = [
  'node_modules', 
  '.git', 
  '.firebase',
  '.vscode',
  'dist', 
  'build', 
  'package-lock.json', 
  'yarn.lock',
  'gerar-contexto.js',
  'prompt_completo.txt',
  '.DS_Store',
  '.ico', '.png', '.jpg', '.jpeg', '.svg', '.woff2' // Ignorar binários
];

const outputFile = 'prompt_completo.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (IGNORE_LIST.includes(file)) return;

    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles('./');
let outputContent = "";

console.log(`Lendo ${allFiles.length} arquivos...`);

allFiles.forEach(file => {
  // Ignora arquivos que não sejam de texto/código comuns
  if (!file.match(/\.(ts|tsx|js|jsx|json|html|css|txt|md)$/)) return;

  try {
    const content = fs.readFileSync(file, 'utf8');
    // Formato que eu entendo perfeitamente
    outputContent += `--- START OF FILE ${file} ---\n\n`;
    outputContent += content + "\n\n";
  } catch (err) {
    console.error(`Erro ao ler ${file}: ${err.message}`);
  }
});

fs.writeFileSync(outputFile, outputContent);
console.log(`Pronto! Conteúdo salvo em ${outputFile}. Copie o texto e cole no chat.`);
