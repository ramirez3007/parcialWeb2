//Crear el servidor
const express = require('express');
// Para leer archivos con file system
const fs = require('fs');
// Para hacer uso de joi
const Joi = require('joi');
// Importar la librería moment para formatear la fecha y hora
const moment = require('moment');  

// para llamar lo que hay en otro modulo
const { leerArchivo, escribirArchivo } = require('./src/files');

const app = express();

app.use(express.json());

const PDFDocument = require('pdfkit');

// Esquema de validación con Joi para el objeto comic
const comicSchema = Joi.object({
    id: Joi.number().integer().min(1).required(),
    nombre: Joi.string().min(3).max(50).required(),
    edad: Joi.number().integer().min(18).max(150).required(),
    ciudad: Joi.string().valid('Gotham', 'Metropolis', 'Otro').required(),
    poderes: Joi.array().items(Joi.string().min(3).max(50)).min(1).required(),
    aliados: Joi.object({
        nombre: Joi.array().items(Joi.string().min(3).max(50)).min(1).required(),
        tipo: Joi.string().valid('Humanos', 'Extraterrestres', 'Animales').required()
    }).required(),
    enemigos: Joi.array().items(Joi.string().min(3).max(50)).min(1).required(),
    primera_aparicion: Joi.string().min(3).max(50).required(),
    hobbies: Joi.array().items(Joi.string().min(3).max(50)).min(1).required(),
    activo: Joi.boolean().required()
}).unknown();

// Obtener la fecha y hora actual en el formato YYYY-MM-DD hh:mm
const getFormattedDate = () => {
    return moment().format('YYYY-MM-DD HH:mm');
};


// Middleware para logging de acceso
app.use((req, res, next) => {
    const logEntry = `${getFormattedDate()} [${req.method} ${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}] [${req.ip}]\n`;
    fs.appendFileSync('access_log.txt', logEntry);
    next();
});

// Middleware para agregar el campo created_at a las solicitudes POST y PUT
const addCreatedAt = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        req.body.created_at = getFormattedDate();
    }
    next();
};

// Middleware para agregar el campo created_at a las solicitudes POST y PUT
app.use(addCreatedAt);

//Rutas
app.get('/comics', (req, res) => {
    // Leer archivo
    const comics = leerArchivo('./db.json');

    if (comics === null) {
        res.status(500).send('Error al leer el archivo');
        return;
    }

    // Filtrar registros si hay un query parameter
    const { ciudad } = req.query;
    let filteredComics = comics;

    if (ciudad) {
        filteredComics = comics.filter(comic => comic.ciudad.toLowerCase() === ciudad.toLowerCase());
    }

    // Enviar respuesta
    res.send(filteredComics);
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
    // Validar los datos recibidos contra el esquema
    const { error, value } = comicSchema.validate(req.body);

    if (error) {
        // Si hay un error en la validación, enviar un error 400 Bad Request
        res.status(400).send(error.details[0].message);
        return;
    }

    const comic = value;
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

    // Validar los datos recibidos contra el esquema
    const { error, value } = comicSchema.validate(comicUpdate, { abortEarly: false });

    if (error) {
        // Si hay un error en la validación, enviar un error 400 Bad Request
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        res.status(400).send(errorMessage);
        return;
    }

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
            ...value  // Usar los valores validados en lugar de los valores originales del body
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

app.put('/comics/updateGlobal', (req, res) => {
    try {
        // Leer el archivo
        let comics = leerArchivo('./db.json');

        if (comics === null) {
            res.status(500).send('Error al leer el archivo');
            return;
        }

        // Actualizar el campo updated_at para cada cómic si no existe
        comics = comics.map(comic => {
            if (typeof comic.updated_at === 'undefined' || comic.updated_at === null) {
                return {
                    ...comic,
                    updated_at: getFormattedDate()
                };
            }
            return comic;
        });

        // Escribir el archivo actualizado
        escribirArchivo('./db.json', comics);

        res.status(200).send('Registros actualizados exitosamente');
    } catch (error) {
        console.error("Error interno del servidor:", error);
        res.status(500).send('Error interno del servidor');
    }
});


//Levantando el servidor para escuchar el puerto 3001
app.listen(3001, () => {
    console.log('Listening on port 3001');
});
