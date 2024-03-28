const fs = require('fs');

function leerArchivo(path) {
    try {
        const data = fs.readFileSync(path, 'utf8');
        const comics = JSON.parse(data).personajes_dc;
        return comics;
    } catch (error) {
        console.error('Error al leer el archivo:', error);
        return null;
    }
}

function escribirArchivo(path, info) {
    const data = JSON.stringify({ personajes_dc: info });
    fs.writeFileSync(path, data);
}

module.exports = {
    leerArchivo,
    escribirArchivo
}

