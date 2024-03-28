//Crear el servidor
const express = require('express');
// Para leer archivos con file system
const fs = require('fs');
// para llamar lo que hay en otro modulo
const { leerArchivo, escribirArchivo } = require('./src/files');

const app = express();
app.use(express.json());

const PDFDocument = require('pdfkit');

//Rutas
app.get('/comics', (req, res) => {
    //Leer archivo
    const comics = leerArchivo('./db.json');
    
    if (comics === null) {
        res.status(500).send('Error al leer el archivo');
        return;
    }

    //Enviar respuesta
    res.send(comics);
});

app.get('/comics/:id', (req, res) => {
    const id = req.params.id;
    const todos = leerArchivo('./db.json');
    
    if (todos === null) {
        res.status(500).send('Error al leer el archivo');
        return;
    }

    const comic = todos.find(comic => comic.id === parseInt(id));
    
    //No existe
    if (!comic) {
        res.status(404).send('No existe');
        return; // actua como un break de un ciclo
    }
    
    //Existe
    res.send(comic);
});

app.post('/comics', (req, res) => {
    const comic = req.body;
    const todos = leerArchivo('./db.json');
    
    if (todos === null) {
        res.status(500).send('Error al leer el archivo');
        return;
    }

    comic.id = todos.length + 1;
    todos.push(comic);
    
    //Escribir archivo
    escribirArchivo('./db.json', todos);
    
    res.status(201).send(comic);
});

app.put('/comics/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const comicUpdate = req.body;
    
    try {
        let data = leerArchivo('./db.json');
        
        if (!data) {
            res.status(500).send('Error al obtener los datos de los cómics');
            return;
        }

        const todos = data;

        // Buscar el cómic por id
        const index = todos.findIndex(comic => comic.id === id);
        
        // Si no se encuentra el cómic
        if (index === -1) {
            res.status(404).send('No existe el cómic');
            return;
        }
        
        // Actualizar el cómic
        todos[index] = {
            ...todos[index],
            ...comicUpdate
        };
        
        // Escribir el archivo
        escribirArchivo('./db.json', todos);
        
        res.send(todos[index]);
    } catch (error) {
        console.error("Error interno del servidor:", error);
        res.status(500).send('Error interno del servidor');
    }
});

app.delete('/comics/:id', (req, res) => {
    const id = req.params.id;
    let todos = leerArchivo('./db.json');
    
    if (todos === null) {
        res.status(500).send('Error al leer el archivo');
        return;
    }

    // Filtrar el cómic a eliminar
    todos = todos.filter(comic => comic.id !== parseInt(id));
    
    // Escribir el archivo
    escribirArchivo('./db.json', todos);
    
    res.status(204).send(); // 204 significa "No Content", que es la respuesta estándar para DELETE exitoso sin contenido devuelto
});

app.get('/generate-pdf', (req, res) => {
    const comics = leerArchivo('./db.json');
    
    if (!comics) {
        res.status(500).send('Error al leer el archivo');
        return;
    }

    const doc = new PDFDocument();

    // Configurar el encabezado para que el navegador sepa que se trata de un archivo PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=comics.pdf');

    doc.pipe(res);  // Piping PDF directly to the response

    doc.fontSize(20).text('Lista de Cómics', {
        align: 'center'
    }).moveDown();

    comics.forEach(comic => {
        doc.fontSize(14).text(`Nombre: ${comic.nombre}`);
        doc.fontSize(10).text(`Edad: ${comic.edad}`);
        doc.fontSize(10).text(`Ciudad: ${comic.ciudad}`);
        doc.fontSize(10).text(`Poderes: ${comic.poderes.join(', ')}`);
        doc.moveDown();
    });

    doc.end();
});


//Levantando el servidor para escuchar el puerto 3001
app.listen(3001, () => {
    console.log('Listening on port 3001');
});
