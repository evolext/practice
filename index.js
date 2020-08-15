const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const spawn = require('child_process').spawn;


const app = express();
const server = require('http').createServer(app);


app.use(express.static(__dirname + '/static'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Отбражение главной страницы приложения
app.get('/', function (request, response) {
    response.sendFile(__dirname + "/index.html");
});

// Получение данных для расчета
app.post('/compute', function(request, response) {
    // Создание файлов для сохранения данных
    fs.mkdirSync(__dirname + '/info');
    fs.writeFileSync('info/objects.txt', '');
    fs.writeFileSync('info/pipes.txt', '');
    fs.writeFileSync('info/node_costs.txt', '');

    // Данные о геообъектах
    for (let [key, value] of Object.entries(request.body.vertices))
        fs.appendFileSync('info/objects.txt', `${key}\n${value.lat}\t${value.lng}\n`);
    // Данные о пайпах
    for (let [key, value] of Object.entries(request.body.edges))
        fs.appendFileSync('info/pipes.txt', `${key}\n${value[0].lat}\t${value[0].lng}\n${value[value.length - 1].lat}\t${value[value.length - 1].lng}\n`);
    // Данные о расходах
    for (let [key, value] of Object.entries(request.body.info))
        fs.appendFileSync('info/node_costs.txt', `${key}\n${value.consumption}\n`);


    // Запуск прогрраммы расчетов
    const calc_prog = spawn('calculation\ programs/main.exe');
    // Вывод ошибок на случай некорректного выполнения программы расчетов
    calc_prog.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    // По окончании расчетов отправить результаты клиенту
    calc_prog.on('exit', function () {
        let result = new Map();
        let lines = fs.readFileSync('info/pipe_costs.txt').toString().split('\n');
        for (let i = 0; i < lines.length - 1; i += 2)
            result.set(lines[i], lines[i + 1]);
        
        response.send({
            data: Object.fromEntries(result)
        });

        // Удаление созданных файлов
        fs.rmdirSync(__dirname + '/info', { recursive: true });
    });


    //console.log(request.body);
});


// Получение данных для сохранения
app.post('/save', function(request, response) {
    // Сохраняем глобальные переменные
    fs.writeFileSync('networks/global.txt', `${request.body.id}\n${request.body.center.lat}\t${request.body.center.lng}`);

    // Сохранение данных о геообъектах
    fs.writeFileSync('networks/objects.txt', '');
    for (let [key, value] of Object.entries(request.body.vertices))
        fs.appendFileSync('networks/objects.txt', `${key}\n${value.type}\n${value.coord.lat}\t${value.coord.lng}\n`);

    // Сохранение данных о пайпах
    fs.writeFileSync('networks/pipes.txt', '');
    for (let [key, value] of Object.entries(request.body.edges)) {
        fs.appendFileSync('networks/pipes.txt', `${key}\n`);
        for (let i = value.length - 1; i >= 0; i--)
            fs.appendFileSync('networks/pipes.txt', `${value[i].lat}\t${value[i].lng}\n`);
        fs.appendFileSync('networks/pipes.txt', '#\n');
    }

    response.send({});

    console.log(request.body.edges);
});

server.listen(5000);