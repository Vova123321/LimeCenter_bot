const TelegramApi = require('node-telegram-bot-api');

const { pool, token_id } = require('./config.js');

const Excel = require('exceljs');

const bot = new TelegramApi(token_id, { polling: true });



async function connectToDatabase() {
    try {
        // Получаем соединение из пула
        const connection = await pool.getConnection();
        console.log('Подключение к базе данных успешно установлено!');

        // Возвращаем соединение в пул
        connection.release();
        return connection;
    } catch (error) {
        console.error('Ошибка при подключении к базе данных:', error);
        throw error;
    }
}

// Вызываем асинхронную функцию для установки подключения
connectToDatabase()
    .then(connection => {
        // Сохраняем соединение в переменной dbConnection

        // Теперь вы можете использовать dbConnection в других частях вашего кода
    })
    .catch(error => {
        console.error('Ошибка при подключении к базе данных:', error);
    });

async function getAllTelegramIds() {
    try {
        // Получаем соединение из пула
        const connection = await pool.getConnection();
        console.log('Подключение к базе данных успешно установлено!');

        // Выполняем запрос к базе данных для получения всех уникальных Telegram ID
        const query = 'SELECT DISTINCT telegram_id FROM orders_notification';
        const [rows, fields] = await connection.execute(query);

        // Освобождаем соединение обратно в пул
        connection.release();

        return rows.map(row => row.telegram_id);
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
        throw error;
    }
}

const userContext = {};

const admin_id = 781115975;
async function getDataForLastHour() {
    try {
        // Получаем текущее время минус один час
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        // Получаем соединение из пула
        const connection = await pool.getConnection();
        console.log('Подключение к базе данных успешно установлено!');

        // Выполняем запрос к базе данных для получения записей за последний час
        const query = 'SELECT * FROM orders WHERE Registered_on >= ?';
        const [rows, fields] = await connection.execute(query, [oneHourAgo]);

        // Освобождаем соединение обратно в пул
        connection.release();

        return rows;
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
        throw error;
    }
}

async function sendRecordsToAllUsers() {
    try {
        // Получаем все Telegram ID из базы данных
        const allTelegramIds = await getAllTelegramIds();

        // Получаем данные за последний час
        const rows = await getDataForLastHour();

        // Отправляем сообщение каждому Telegram ID
        for (const telegramId of allTelegramIds) {
            // Формируем сообщение для отправки каждому пользователю
            let message = `За последний час появилось ${rows.length} новых записей:\n`;
            for (const row of rows) {
                message += `ID: ${row.id}\nФамилия: ${row.Surname}\nИмя: ${row.Name}\nОтчество: ${row.Patronymc}\nТелефон: ${row.Phone}\nНужно ли позвонить: ${row.PhoneCall}\nE-mail: ${row.Email}\nВремя регистрации на сайте: ${row.Registered_on}\nПодтверждение: ${row.Confirmed}\nГород: ${row.city}\nОпыт: ${row.experience}\nТип работы: ${row.work_type}\nВозраст: ${row.age}\nВозможности: ${row.equipment}\n\n`;
            }

            // Отправляем сообщение пользователю
            await bot.sendMessage(telegramId, message);
        }

    } catch (error) {
        console.error('Ошибка при отправке данных:', error);
    }
}

// Вызываем функцию каждый час
setInterval(() => {
    sendRecordsToAllUsers();
}, 3600000); // 3600000 миллисекунд = 1 час


// Вызываем функцию каждый час
async function getDataFromDateRange(startDate, endDate) {
    try {
        // Создаем пул соединений
        const connection = await pool.getConnection();

        // Получаем соединение из пула
        console.log('Подключение к базе данных успешно установлено!');

        // Выполняем запрос к базе данных
        const query = 'SELECT * FROM orders WHERE Registered_on >= ? AND Registered_on <= ?';
        const [rows, fields] = await connection.execute(query, [startDate, endDate]);

        console.log(rows);
        // Освобождаем соединение обратно в пул
        connection.release();

        return rows;
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
        throw error;
    }
}

async function exportToExcel(data) {
    // Создаем новую книгу Excel
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Добавляем заголовки столбцов (если нужно)
    worksheet.addRow(Object.keys(data[0]));

    // Добавляем данные в таблицу
    data.forEach((row) => {
        const values = Object.values(row);
        worksheet.addRow(values);
    });

    // Сохраняем книгу в файл
    await workbook.xlsx.writeFile('data.xlsx');
}

const commands = [
    {
        command: "start",
        description: "Запуск бота"
    },
]
bot.setMyCommands(commands);

const messageHandler = async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Проверяем, что сообщение приходит от нужного пользователя
    if (userContext[userId] && userContext[userId].awaitingResponse) {
        // Проверяем, что пользователь ожидает ответа
        if (chatId === userId) {
            // Здесь ваша логика обработки сообщения
            // Можете вызвать соответствующую функцию для обработки
        }
    }
};

bot.on('message', messageHandler);

// ПОЛУЧЕНИЯ ДОСТУПА К ЧАТУ
async function access(chatId) {
    bot.sendMessage(chatId, 'Нажмите кнопку ниже что бы получить доступ к чату обучения ', {
        reply_markup: {
            keyboard: [
                ["Получить доступ к обучению"]
            ],
            resize_keyboard: true
        }
    })
}

async function admin_panel(msg) {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 'Вы в админ-панели!\n\nВыберите нужную настройку', {
        reply_markup: {
            keyboard: [
                ["Настройки Админ-панели","Настройка чатов с менеджером"],
                ["Настройка пароля и ссылки на обучения", "Просмотр сохранённых данных"],
                ["Получить список заявок за определённый период"],
                ["Изменить название чатов"],
                ["Изменить ссылку на видео"],
                ["Изменить скрипт"],
                ["Управление уведомлениями"],
                ["Выйти с Админ-панели"],

            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    })
}

async function deleteTable(enteredTableName) {
    // Создаем подключение к базе данных

    const connection = await pool.getConnection();

    try {
        // SQL-запрос на удаление таблицы
        const sql = `DROP TABLE IF EXISTS \`${enteredTableName}\``;
        const [rows, fields] = await connection.execute(sql);

        console.log(`Таблица ${enteredTableName} успешно удалена`);
        connection.release();
    } catch (error) {
        console.error('Ошибка при удалении таблицы:', error);
    } finally {

    }
}


const commandHandlers = {
    "/funny": async (msg) => {
        const chatId = msg.chat.id;

        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {
            await bot.sendMessage(chatId, 'Введите название таблицы для удаления: ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler');
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    bot.off('message', messageHandler);
                    const enteredTableName = msg.text;

                    try {
                        const connection = await pool.getConnection();
                        console.log('Подключение к базе данных успешно установлено!');

                        // Выполнение запроса к базе данных для удаления таблицы
                        await connection.query(`DROP TABLE IF EXISTS ${enteredTableName}`);

                        // Освобождаем соединение обратно в пул
                        connection.release();

                        await bot.sendMessage(chatId, `Таблица '${enteredTableName}' успешно удалена.`);
                    } catch (error) {
                        console.error('Ошибка при удалении таблицы:', error);
                        await bot.sendMessage(chatId, `Произошла ошибка при удалении таблицы '${enteredTableName}'.`);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
        } catch (error) {
            console.error(error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    },
    "/real_admin" : async (msg) => {
        const chatId = msg.chat.id;
        admin_panel(msg);
    },
    "/start": (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'Здравствуйте! \nНажмите кнопку ниже что бы подтвердить заявку', {
            reply_markup: {
                keyboard: [
                    ["Подтвердить заявку"]
                ],
                resize_keyboard: true
            }
        });
    },
    "Управление уведомлениями": async (msg) => {
      await bot.sendMessage(msg.chat.id, 'Вы в настройках уведомлений', {
          reply_markup: {
              inline_keyboard: [
                  [{ text: `Добавить пользователя`, callback_data: 'notification_allow' }],
                  [{ text: `Удалить пользователя`, callback_data: 'notification_not_allow' }],
              ]
          }
      });
    },
    "Изменить скрипт": async (msg) => {
        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Соединение с базой данных открыто');

            // Выполняем запрос для получения режима скрипта
            const [results] = await connection.execute("SELECT script_mode FROM mode WHERE id = ?", [1]);
            const mode = results[0].script_mode;

            // Обновляем режим скрипта в зависимости от текущего значения
            if (mode === 1) {
                await connection.execute("UPDATE mode SET script_mode = ?  WHERE id = ?", [2, 1]);
                await bot.sendMessage(msg.chat.id, 'Скрипт был сменен: видео');
            } else if (mode === 2) {
                await connection.execute("UPDATE mode SET script_mode = ?  WHERE id = ?", [1, 1]);
                await bot.sendMessage(msg.chat.id, 'Скрипт был сменен: чаты');
            }

            // Освобождаем соединение обратно в пул
            connection.release();
            console.log('Соединение с базой данных закрыто');

            // Вызываем функцию admin_panel
            admin_panel(msg);
        } catch (error) {
            console.error('Ошибка при выполнении скрипта:', error);
            throw error;
        }
    },
    "Изменить ссылку на видео": async (msg) => {
        const chatId = msg.chat.id;
        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {
            await bot.sendMessage(chatId, 'Введите новую ссылку: ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                bot.off('message', messageHandler);
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    bot.off('message', messageHandler);
                    const enteredNewLink = msg.text;

                    try {
                        // Получаем соединение из пула
                        const connection = await pool.getConnection();
                        console.log('Соединение с бд открыто');

                        // Выполнение запроса к базе данных для обновления ссылки
                        await connection.execute('UPDATE video_src SET src = ? WHERE id = ?', [enteredNewLink, 1]);

                        // Отправка сообщения об успешном обновлении ссылки
                        await bot.sendMessage(chatId, 'Ссылка была сменена на: ' + enteredNewLink);
                        admin_panel(msg);
                        // Отписываемся от обработчика после проверки сообщения
                        bot.off('message', messageHandler);
                        userContext[chatId].awaitingResponse = false;

                        // Освобождаем соединение обратно в пул
                        connection.release();
                        console.log('Соединение с бд закрыто');
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
        } catch (e) {
            console.log(e);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    },
    "Изменить название чатов": async (msg) => {
        const chatId = msg.chat.id;

        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Выполняем запрос к базе данных для получения названий чатов
            const [results] = await connection.execute('SELECT title FROM Learn_src ');

            const title1 = results[0].title;
            const title2 = results[1].title;
            const title3 = results[2].title;
            console.log(title1, title2, title3);

            // Отправляем сообщение с кнопками для изменения названий чатов
            await bot.sendMessage(chatId, 'Вы в настройках названий на чаты', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `Изменить название 1 чата`, callback_data: 'change_title1' }],
                        [{ text: `Изменить название 2 чата`, callback_data: 'change_title2' }],
                        [{ text: `Изменить название 3 чата`, callback_data: 'change_title3' }],
                        [{ text: 'Назад', callback_data: 'back' }]
                    ]
                }
            });

            // Освобождаем соединение обратно в пул
            connection.release();
            console.log('Соединение с бд закрыто');
        } catch (error) {
            console.error('Ошибка при выполнении запроса к базе данных:', error);
            await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
        }
    },
    "Подтвердить заявку": async (msg) => {
        const chatId = msg.chat.id;

        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {
            await bot.sendMessage(chatId, 'Введите ваш email: ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                bot.off('message', messageHandler);
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredEmail = msg.text.trim();
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(enteredEmail)) {
                        await bot.sendMessage(chatId, 'Неверный формат email. Введите email еще раз.');
                        return;
                    }

                    try {
                        const username = msg.from.username;
                        const link_user = 'https://t.me/' + username;

                        // Получаем соединение из пула
                        const connection = await pool.getConnection();
                        console.log('Подключение к базе данных успешно установлено!');

                        // Проверяем существование email и значения поля подтверждения в базе данных
                        const [results] = await connection.execute('SELECT * FROM orders WHERE Email = ? AND Confirmed = 0', [enteredEmail]);

                        if (results.length === 0) {
                            await bot.sendMessage(chatId, 'Ошибка: такой почты нет или она уже подтверждена.');
                            connection.release();
                            console.log('Соединение с базой данных закрыто');
                            return;
                        }

                        // Обновляем поле подтверждения на 1
                        await connection.execute('UPDATE orders SET Confirmed = 1, Telegram_id = ? WHERE Email = ?', [link_user, enteredEmail]);

                        await connection.release();
                        console.log('Соединение с базой данных закрыто');

                        userContext[chatId].awaitingResponse = false;

                        try {
                            // Получаем соединение из пула
                            const connection = await pool.getConnection();
                            console.log('Подключение к базе данных успешно установлено!');

                            // Получаем значение поля script_mode из базы данных
                            const [results] = await connection.execute('SELECT script_mode FROM mode WHERE id = 1');

                            if (results.length === 0) {
                                await bot.sendMessage(chatId, 'Ошибка: не удалось найти ссылку для указанного времени.');
                                connection.release();
                                console.log('Соединение с базой данных закрыто');
                                return;
                            }

                            const mode = results[0].script_mode;
                            console.log(mode);

                            await connection.release();
                            console.log('Соединение с базой данных закрыто');

                            if (mode === 1) {
                                // В случае mode = 1 создаем кнопки из базы данных
                                const connection = await pool.getConnection();
                                console.log('Подключение к базе данных успешно установлено!');

                                const [results] = await connection.execute('SELECT title FROM Learn_src ');

                                if (results.length === 0) {
                                    await bot.sendMessage(chatId, 'Ошибка: кнопки не найдены.');
                                    connection.release();
                                    console.log('Соединение с базой данных закрыто');
                                    return;
                                }
                                const keyboardButtons = results.map(result => [result.title]); // Создаем массив кнопок

                                await connection.release();
                                console.log('Соединение с базой данных закрыто');

                                await bot.sendMessage(chatId, 'Заявка подтверждена успешно:', {
                                    reply_markup: {
                                        keyboard: keyboardButtons,
                                        resize_keyboard: true
                                    }
                                });
                            } else if (mode === 2) {
                                // В случае mode = 2 отправляем сообщение с кнопкой
                                await bot.sendMessage(chatId, 'Заявка подтверждена успешно!', {
                                    reply_markup: {
                                        keyboard: [
                                            ["Посмотреть вебинар о вакансии"],
                                        ],
                                        resize_keyboard: true
                                    }
                                });
                            }

                        } catch (error) {
                            console.error('Ошибка выполнения запроса: ' + error.stack);
                            await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                        }

                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Отписываемся от обработчика после проверки сообщения
                        bot.off('message', messageHandler);
                        userContext[chatId].awaitingResponse = false;
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    },
    "/admin_panel": async (msg) => {
        const chatId = msg.chat.id;

        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {
            await bot.sendMessage(chatId, 'Введите пароль: ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                bot.off('message', messageHandler);
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredPassword = msg.text;

                    try {
                        // Получаем соединение из пула
                        const connection = await pool.getConnection();
                        console.log('Подключение к базе данных успешно установлено!');

                        // Запрос к базе данных для получения пароля
                        const [results] = await connection.execute('SELECT Password FROM admin_panel WHERE password = ?', [enteredPassword]);

                        if (results.length === 0) {
                            // Если пароль не найден в базе данных
                            await bot.sendMessage(chatId, 'Ошибка: неверный пароль.');
                            await bot.sendMessage(chatId, 'Введите пароль снова:');
                            connection.release();
                            console.log('Соединение с базой данных /admin_panel закрыто');
                            return;
                        }

                        // Пароль найден, вызываем функцию для административной панели
                        admin_panel(msg);

                        await connection.release();
                        console.log('Соединение с базой данных /admin_panel закрыто');

                        userContext[chatId].awaitingResponse = false;

                        bot.off('message', messageHandler);
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    },
    // "Чат с менеджером на 10:00 по мск": async (msg) => {
    //     const chatId = msg.chat.id;
    //
    //     try {
    //         // Выполнение запроса к базе данных с использованием промиса
    //         const [results] = await connection.execute('SELECT src FROM Learn_src WHERE id = 1');
    //
    //         if (results.length === 0) {
    //             // Если запись с указанным id не найдена
    //             await bot.sendMessage(chatId, 'Ошибка: не удалось найти ссылку для указанного времени.');
    //             return;
    //         }
    //
    //         // Отправляем ссылку пользователю
    //         await bot.sendMessage(chatId, results[0].src);
    //         await access(chatId);
    //     } catch (error) {
    //         console.error('Ошибка выполнения запроса: ' + error.stack);
    //         await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
    //     }
    //
    // },
    // "Чат с менеджером на 14:00 по мск": async (msg) => {
    //     const chatId = msg.chat.id;
    //
    //     try {
    //         // Выполнение запроса к базе данных с использованием промиса
    //         const [results] = await connection.execute('SELECT src FROM Learn_src WHERE id = 2');
    //
    //         if (results.length === 0) {
    //             // Если запись с указанным id не найдена
    //             await bot.sendMessage(chatId, 'Ошибка: не удалось найти ссылку для указанного времени.');
    //             return;
    //         }
    //
    //         // Отправляем ссылку пользователю
    //         await bot.sendMessage(chatId, results[0].src);
    //         await access(chatId);
    //     } catch (error) {
    //         console.error('Ошибка выполнения запроса: ' + error.stack);
    //         await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
    //     }
    // },
    // "Чат с менеджером на 17:00 по мск": async (msg) => {
    //     const chatId = msg.chat.id;
    //
    //     try {
    //         // Выполнение запроса к базе данных с использованием промиса
    //         const [results] = await connection.execute('SELECT src FROM Learn_src WHERE id = 3');
    //
    //         if (results.length === 0) {
    //             // Если запись с указанным id не найдена
    //             await bot.sendMessage(chatId, 'Ошибка: не удалось найти ссылку для указанного времени.');
    //             return;
    //         }
    //
    //         // Отправляем ссылку пользователю
    //         await bot.sendMessage(chatId, results[0].src);
    //         await access(chatId);
    //     } catch (error) {
    //         console.error('Ошибка выполнения запроса: ' + error.stack);
    //         await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
    //     }
    // },
    "Получить доступ к обучению": async (msg) => {
        const chatId = msg.chat.id;

        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {
            await bot.sendMessage(chatId, 'Введите пароль(его выдает менеджер): ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredPassword = msg.text;

                    try {
                        // Получаем соединение из пула
                        const connection = await pool.getConnection();
                        console.log('Подключение к базе данных успешно установлено!');

                        // Выполнение запроса к базе данных для получения пароля и ссылки
                        const [results] = await connection.execute('SELECT Password, Link FROM Learn_acces WHERE password = ?', [enteredPassword]);

                        if (results.length === 0) {
                            // Если пароль не найден в базе данных
                            await bot.sendMessage(chatId, 'Ошибка: неверный пароль.');
                            await bot.sendMessage(chatId, 'Введите пароль снова:');
                            connection.release();
                            console.log('Соединение с базой данных закрыто');
                            return;
                        }

                        // Пароль найден, отправляем ссылку пользователю
                        await bot.sendMessage(chatId, 'Ваша ссылка на обучение: ' + results[0].Link);
                        await bot.sendMessage(chatId, 'Удачного обучения! ', {
                            reply_markup: {
                                remove_keyboard: true
                            }
                        });

                        await connection.release();
                        console.log('Соединение с базой данных закрыто');

                        userContext[chatId].awaitingResponse = false;
                        // Отписываемся от обработчика после проверки сообщения
                        bot.off('message', messageHandler);
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    },
    "Настройки Админ-панели": async (msg) => {
        const chatId = msg.chat.id;
        console.log('Зашли в настройки админ-панели')
        await bot.sendMessage(chatId, 'Вы в настройках админ-панели', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Сменить пароль', callback_data: 'change_password_admin' }],
                    [{ text: 'Назад', callback_data: 'back' }]
                ]
            }
        });
    },
    "Настройка чатов с менеджером": (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'Настройте ссылки на чаты с менеджером', {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Сменить ссылку на 1 кнопку' , callback_data: 'change_10'}],
                    [{text: 'Сменить ссылку на 2 кнопку' , callback_data: 'change_14'}],
                    [{text: 'Сменить ссылку на 3 кнопку', callback_data: 'change_17'}],
                    [{text: 'Назад', callback_data: 'back'}],
                ]
            }
        })
    },
    "Настройка пароля и ссылки на обучения": (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'Настройте ссылку и пароль для обучения', {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Сменить пароль', callback_data: 'change_password_curs' }],
                    [{text: 'Сменить ссылку на обучение', callback_data: 'change_link'}],
                    [{text: 'Назад', callback_data: 'back'}],
                ]
            }
        })
    },
    "Получить список заявок за определённый период": async (msg) => {
        const chatId = msg.chat.id;

        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {
            await bot.sendMessage(chatId, 'Введите дату начала периода в формате YYYY-MM-DD: ');

            const messageHandlerStartDate = async (msg) => {
                bot.off('message', messageHandlerStartDate);
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const startDate = msg.text;
                    try {
                        await bot.sendMessage(chatId, 'Введите дату окончания периода в формате YYYY-MM-DD: ');

                        const messageHandlerEndDate = async (msg) => {
                            bot.off('message', messageHandlerEndDate);
                            userContext[chatId].awaitingResponse = true;
                            if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                                const endDate = msg.text;

                                try {
                                    // Получаем данные за указанный период из базы данных
                                    const data = await getDataFromDateRange(startDate, endDate);

                                    console.log(data);
                                    // Экспортируем данные в файл Excel
                                    await exportToExcel(data);
                                    // Отправляем пользователю сообщение с файлом Excel
                                    await bot.sendDocument(chatId, 'data.xlsx');

                                    userContext[chatId].awaitingResponse = false;
                                } catch (error) {
                                    console.error('Ошибка:', error);
                                    await bot.sendMessage(chatId, 'Произошла ошибка при обработке запроса.');
                                }
                            }
                        };

                        bot.on('message', messageHandlerEndDate);

                        userContext[chatId].awaitingResponse = false;
                    } catch (error) {
                        console.error('Ошибка при отправке сообщения: ' + error.stack);
                    } finally {
                        userContext[chatId].awaitingResponse = false;
                    }
                }
            };

            bot.on('message', messageHandlerStartDate);

            userContext[chatId].awaitingResponse = false;
        } catch (error) {
            console.error('Ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    },
    "Просмотр сохранённых данных": async (msg) => {
        const chatId = msg.chat.id;

        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Выполнение первого запроса к базе данных
            const [accessResults] = await connection.execute('SELECT * FROM Learn_acces');

            // Отправка сообщения с данными из первого запроса
            await bot.sendMessage(chatId, 'Чат для обучения \n' + 'Ссылка: ' + accessResults[0].Link + '\n' + 'Пароль: ' + accessResults[0].Password);

            // Выполнение второго запроса к базе данных
            const [sourceResults] = await connection.execute('SELECT * FROM Learn_src');

            // Создание массива промисов для обработки результатов второго запроса
            const promises = sourceResults.map(async (row) => {
                const messageId = row.id; // ID записи в базе данных
                const title = row.title; // Значение поля title
                const src = row.src; // Значение поля src

                // Формируем текст сообщения с информацией о записи
                const messageText = `ID: ${messageId}\nЗаголовок: ${title}\nСсылка: ${src}`;

                // Отправляем сообщение в чат
                await bot.sendMessage(chatId, messageText);
            });

            // Ждем завершения всех промисов
            await Promise.all(promises);

            // Возвращаем соединение в пул
            connection.release();

            console.log('Закрытие соединения с базой данных');
        } catch (error) {
            console.error('Ошибка выполнения запроса: ' + error.stack);
            await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
        }
    },
    "Посмотреть вебинар о вакансии": async (msg) => {
        const chatId = msg.chat.id;
        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Выполнение запроса к базе данных с использованием промиса
            const [results] = await connection.execute('SELECT src FROM video_src WHERE id = 1');

            if (results.length === 0) {
                // Если запись с указанным id не найдена
                await bot.sendMessage(chatId, 'Ошибка: не удалось найти ссылку для указанного времени.');
                return;
            }

            // Отправляем ссылку пользователю
            await bot.sendMessage(chatId, "Ссылка на видео: " + results[0].src);
            await access(chatId);

            // Возвращаем соединение в пул
            connection.release();

            console.log('Закрытие соединения с базой данных');
        } catch (error) {
            console.error('Ошибка выполнения запроса: ' + error.stack);
            await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
        }
    },
    "Выйти с Админ-панели": (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'Вы вышли с админ-панели! ', {
            reply_markup: {
                remove_keyboard: true
            }
        });
    },


};

let admin_msg = 0;

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    if (data === 'change_password_admin') {
        const chatId = callbackQuery.message.chat.id;
        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            if (!userContext[chatId]) {
                userContext[chatId] = { awaitingResponse: true };
            } else {
                userContext[chatId].awaitingResponse = true;
            }

            // Отправляем сообщение пользователю с запросом на ввод нового пароля
            await bot.sendMessage(chatId, 'Введите новый пароль: ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewPassword = msg.text;

                    try {
                        // Обновление пароля в базе данных
                        await connection.execute('UPDATE admin_panel SET Password = ? WHERE id = ?', [enteredNewPassword, 1]);

                        // Уведомляем пользователя о смене пароля
                        await bot.sendMessage(chatId, 'Новый пароль успешно установлен: ' + enteredNewPassword);

                        // Успешно завершаем запрос
                        userContext[chatId].awaitingResponse = false;

                        // Возвращаем соединение в пул
                        connection.release();

                        console.log('Закрытие соединения с базой данных');
                    } catch (error) {
                        console.error('Произошла ошибка:', error);
                        await bot.sendMessage(chatId, 'Произошла ошибка при изменении пароля.');
                    } finally {
                        // Отписываемся от обработчика сообщений
                        bot.off('message', messageHandler);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);

            // Устанавливаем флаг ожидания ответа пользователя
            userContext[chatId].awaitingResponse = true;
        } catch (error) {
            console.error('Произошла ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'back') {
        bot.sendMessage(chatId, 'Вы вышли из данной настройки')
    }
    else if (data === 'change_10') {
        const chatId = callbackQuery.message.chat.id;

        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            if (!userContext[chatId]) {
                userContext[chatId] = { awaitingResponse: true };
            } else {
                userContext[chatId].awaitingResponse = true;
            }

            // Отправляем сообщение пользователю с запросом на ввод новой ссылки
            await bot.sendMessage(chatId, 'Введите новую ссылку на 1 кнопку: ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewLink = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления ссылки
                        await connection.execute('UPDATE Learn_src SET src = ? WHERE id = ?', [enteredNewLink, 1]);

                        // Отправка сообщения об успешном обновлении ссылки
                        await bot.sendMessage(chatId, 'Ссылка на 1 кнопку была сменена: ' + enteredNewLink);
                        await bot.sendMessage(chatId, 'Настройте ссылки на чаты с менеджером', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{text: 'Сменить ссылку на 1 кнопку', callback_data: 'change_10'}],
                                    [{text: 'Сменить ссылку на 2 кнопку', callback_data: 'change_14'}],
                                    [{text: 'Сменить ссылку на 3 кнопку', callback_data: 'change_17'}],
                                    [{text: 'Назад', callback_data: 'back'}],
                                ]
                            }
                        });

                        // Успешно завершаем запрос
                        userContext[chatId].awaitingResponse = false;

                        // Возвращаем соединение в пул
                        connection.release();

                        console.log('Закрытие соединения с базой данных');
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Отписываемся от обработчика сообщений
                        bot.off('message', messageHandler);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);

            // Устанавливаем флаг ожидания ответа пользователя
            userContext[chatId].awaitingResponse = true;
        } catch (error) {
            console.error('Произошла ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'change_14') {
        const chatId = callbackQuery.message.chat.id;

        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            if (!userContext[chatId]) {
                userContext[chatId] = { awaitingResponse: true };
            } else {
                userContext[chatId].awaitingResponse = true;
            }

            // Отправляем сообщение пользователю с запросом на ввод новой ссылки
            await bot.sendMessage(chatId, 'Введите новую ссылку на 2 кнопку : ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewLink = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления ссылки
                        await connection.execute('UPDATE Learn_src SET src = ? WHERE id = ?', [enteredNewLink, 2]);

                        // Отправка сообщения об успешном обновлении ссылки
                        await bot.sendMessage(chatId, 'Ссылка на 2 кнопку была сменена: ' + enteredNewLink);
                        await bot.sendMessage(chatId, 'Настройте ссылки на чаты с менеджером', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{text: 'Сменить ссылку на 1 кнопку', callback_data: 'change_10'}],
                                    [{text: 'Сменить ссылку на 2 кнопку', callback_data: 'change_14'}],
                                    [{text: 'Сменить ссылку на 3 кнопку', callback_data: 'change_17'}],
                                    [{text: 'Назад', callback_data: 'back'}],
                                ]
                            }
                        });

                        // Успешно завершаем запрос
                        userContext[chatId].awaitingResponse = false;

                        // Возвращаем соединение в пул
                        connection.release();

                        console.log('Закрытие соединения с базой данных');
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Отписываемся от обработчика сообщений
                        bot.off('message', messageHandler);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);

            // Устанавливаем флаг ожидания ответа пользователя
            userContext[chatId].awaitingResponse = true;
        } catch (error) {
            console.error('Произошла ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'change_17') {
        const chatId = callbackQuery.message.chat.id;

        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            if (!userContext[chatId]) {
                userContext[chatId] = { awaitingResponse: true };
            } else {
                userContext[chatId].awaitingResponse = true;
            }

            // Отправляем сообщение пользователю с запросом на ввод новой ссылки
            await bot.sendMessage(chatId, 'Введите новую ссылку на 3 кнопку : ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewLink = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления ссылки
                        await connection.execute('UPDATE Learn_src SET src = ? WHERE id = ?', [enteredNewLink, 3]);

                        // Отправка сообщения об успешном обновлении ссылки
                        await bot.sendMessage(chatId, 'Ссылка на 3 кнопку была сменена: ' + enteredNewLink);
                        await bot.sendMessage(chatId, 'Настройте ссылки на чаты с менеджером', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{text: 'Сменить ссылку на 1 кнопку', callback_data: 'change_10'}],
                                    [{text: 'Сменить ссылку на 2 кнопку', callback_data: 'change_14'}],
                                    [{text: 'Сменить ссылку на 3 кнопку', callback_data: 'change_17'}],
                                    [{text: 'Назад', callback_data: 'back'}],
                                ]
                            }
                        });

                        // Успешно завершаем запрос
                        userContext[chatId].awaitingResponse = false;

                        // Возвращаем соединение в пул
                        connection.release();

                        console.log('Закрытие соединения с базой данных');
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Отписываемся от обработчика сообщений
                        bot.off('message', messageHandler);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);

            // Устанавливаем флаг ожидания ответа пользователя
            userContext[chatId].awaitingResponse = true;
        } catch (error) {
            console.error('Произошла ошибка:', error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'change_password_curs') {
        const chatId = callbackQuery.message.chat.id;

        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            if (!userContext[chatId]) {
                userContext[chatId] = { awaitingResponse: true };
            } else {
                userContext[chatId].awaitingResponse = true;
            }

            // Отправляем сообщение пользователю с запросом на ввод нового пароля
            await bot.sendMessage(chatId, 'Введите новый пароль к обучению : ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    bot.off('message', messageHandler);
                    const enteredNewPassword = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления пароля
                        await connection.execute('UPDATE Learn_acces SET Password = ? WHERE id = ?', [enteredNewPassword, 1]);

                        // Отправка сообщения об успешном обновлении пароля
                        await bot.sendMessage(chatId, 'Пароль к обучению был сменён: ' + enteredNewPassword);
                        await bot.sendMessage(chatId, 'Настройте ссылку и пароль для обучения', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{text: 'Сменить пароль', callback_data: 'change_password_curs' }],
                                    [{text: 'Сменить ссылку на обучение', callback_data: 'change_link'}],
                                    [{text: 'Назад', callback_data: 'back'}],
                                ]
                            }
                        });

                        // Успешно завершаем запрос
                        userContext[chatId].awaitingResponse = false;

                        // Возвращаем соединение в пул
                        connection.release();

                        console.log('Закрытие соединения с базой данных');
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Отписываемся от обработчика сообщений
                        bot.off('message', messageHandler);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);

            // Устанавливаем флаг ожидания ответа пользователя
            userContext[chatId].awaitingResponse = true;
        } catch (error) {
            console.log(error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'change_link') {
        const chatId = callbackQuery.message.chat.id;

        try {
            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            if (!userContext[chatId]) {
                userContext[chatId] = { awaitingResponse: true };
            } else {
                userContext[chatId].awaitingResponse = true;
            }

            // Отправляем сообщение пользователю с запросом на ввод новой ссылки
            await bot.sendMessage(chatId, 'Введите новую ссылку к обучению : ');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler')
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    bot.off('message', messageHandler);
                    const enteredNewLink = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления ссылки
                        await connection.execute('UPDATE Learn_acces SET Link = ? WHERE id = ?', [enteredNewLink, 1]);

                        // Отправка сообщения об успешном обновлении ссылки
                        await bot.sendMessage(chatId, 'Ссылка на обучение была изменена: ' + enteredNewLink);
                        await bot.sendMessage(chatId, 'Настройте ссылку и пароль для обучения', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{text: 'Сменить пароль', callback_data: 'change_password_curs' }],
                                    [{text: 'Сменить ссылку на обучение', callback_data: 'change_link'}],
                                    [{text: 'Назад', callback_data: 'back'}],
                                ]
                            }
                        });

                        // Успешно завершаем запрос
                        userContext[chatId].awaitingResponse = false;

                        // Возвращаем соединение в пул
                        connection.release();

                        console.log('Закрытие соединения с базой данных');
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Отписываемся от обработчика сообщений
                        bot.off('message', messageHandler);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);

            // Устанавливаем флаг ожидания ответа пользователя
            userContext[chatId].awaitingResponse = true;
        } catch (error) {
            console.log(error);
        } finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'change_title1') {
        const chatId = callbackQuery.message.chat.id;
        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }
        try {

            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Отправляем сообщение пользователю с запросом на ввод нового названия
            await bot.sendMessage(chatId, 'Введите новое название: ');

            // await connection.execute('UPDATE admin_status SET status = 1 WHERE id = 1');
            //
            // console.log('админ-статус = 1');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler');
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewTitle = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления названия
                        await connection.execute('UPDATE Learn_src SET title = ? WHERE id = ?', [enteredNewTitle, 1]);

                        // Отправляем сообщение об успешном обновлении названия
                        await bot.sendMessage(chatId, 'Название было изменено: ' + enteredNewTitle);

                        userContext[chatId].awaitingResponse = false;
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // await connection.execute('UPDATE admin_status SET status = 0 WHERE id = 1');
                        // console.log('админ-статус = 0');
                        userContext[chatId].awaitingResponse = false;
                        // Возвращаем администратора в админское меню
                        await admin_panel(msg);
                        // Возвращаем соединение в пул
                        connection.release();
                        console.log('Закрытие соединения с базой данных');
                        // Удаляем обработчик сообщений
                        bot.off('message', messageHandler);
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
            userContext[chatId].awaitingResponse = false;
        } catch (error) {
            console.log(error);
        }
        finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'change_title2') {
        const chatId = callbackQuery.message.chat.id;
        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }
        try {

            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Отправляем сообщение пользователю с запросом на ввод нового названия
            await bot.sendMessage(chatId, 'Введите новое название: ');

            // await connection.execute('UPDATE admin_status SET status = 1 WHERE id = 1');
            //
            // console.log('админ-статус = 1');

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler');
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewTitle = msg.text;

                    try {

                        // Выполнение запроса к базе данных для обновления названия
                        await connection.execute('UPDATE Learn_src SET title = ? WHERE id = ?', [enteredNewTitle, 2]);

                        // Отправляем сообщение об успешном обновлении названия
                        await bot.sendMessage(chatId, 'Название было изменено: ' + enteredNewTitle);

                        userContext[chatId].awaitingResponse = false;
                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // await connection.execute('UPDATE admin_status SET status = 0 WHERE id = 1');
                        // console.log('админ-статус = 0');

                        // Возвращаем администратора в админское меню
                        await admin_panel(msg);
                        // Возвращаем соединение в пул
                        connection.release();
                        console.log('Закрытие соединения с базой данных');
                        // Удаляем обработчик сообщений
                        bot.off('message', messageHandler);
                        userContext[chatId].awaitingResponse = false;
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
            userContext[chatId].awaitingResponse = false;
        } catch (error) {
            console.log(error);
        }
        finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'change_title3') {
        const chatId = callbackQuery.message.chat.id;
        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {


            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Отправляем сообщение пользователю с запросом на ввод нового названия
            await bot.sendMessage(chatId, 'Введите новое название: ');

            // await connection.execute('UPDATE admin_status SET status = 1 WHERE id = 1')
            //
            // console.log('админ-статус = 1')

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler');
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewTitle = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления названия
                        await connection.execute('UPDATE Learn_src SET title = ? WHERE id = ?', [enteredNewTitle, 3]);

                        // Отправляем сообщение об успешном обновлении названия
                        await bot.sendMessage(chatId, 'Название было изменено: ' + enteredNewTitle);

                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Возвращаем администратора в админское меню
                        await admin_panel(msg);
                        // Возвращаем соединение в пул
                        connection.release();
                        console.log('Закрытие соединения с базой данных');
                        // Удаляем обработчик сообщений
                        bot.off('message', messageHandler);

                        // await connection.execute('UPDATE admin_status SET status = 0 WHERE id = 1')
                        // console.log('админ-статус = 0');

                        userContext[chatId].awaitingResponse = false;
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
            userContext[chatId].awaitingResponse = false;
        } catch (error) {
            console.log(error);
        }
        finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'notification_allow') {
        const chatId = callbackQuery.message.chat.id;
        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {


            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Отправляем сообщение пользователю с запросом на ввод нового названия
            await bot.sendMessage(chatId, 'Введите новый ID: ');

            // await connection.execute('UPDATE admin_status SET status = 1 WHERE id = 1')
            //
            // console.log('админ-статус = 1')

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler');
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewTitle = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления названия
                        await connection.execute('INSERT INTO orders_notification (telegram_id) VALUES (?)', [enteredNewTitle]);


                        // Отправляем сообщение об успешном обновлении названия
                        await bot.sendMessage(chatId, 'Новый айди был добавлен: ' + enteredNewTitle);

                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Возвращаем администратора в админское меню
                        await admin_panel(msg);
                        // Возвращаем соединение в пул
                        connection.release();
                        console.log('Закрытие соединения с базой данных');
                        // Удаляем обработчик сообщений
                        bot.off('message', messageHandler);

                        // await connection.execute('UPDATE admin_status SET status = 0 WHERE id = 1')
                        // console.log('админ-статус = 0');

                        userContext[chatId].awaitingResponse = false;
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
            userContext[chatId].awaitingResponse = false;
        } catch (error) {
            console.log(error);
        }
        finally {
            userContext[chatId].awaitingResponse = false;
        }
    }
    else if (data === 'notification_not_allow') {
        const chatId = callbackQuery.message.chat.id;
        if (!userContext[chatId]) {
            userContext[chatId] = { awaitingResponse: true };
        } else {
            userContext[chatId].awaitingResponse = true;
        }

        try {


            // Получаем соединение из пула
            const connection = await pool.getConnection();
            console.log('Подключение к базе данных успешно установлено!');

            // Отправляем сообщение пользователю с запросом на ввод нового названия
            await bot.sendMessage(chatId, 'Введите ID для удаления: ');

            // await connection.execute('UPDATE admin_status SET status = 1 WHERE id = 1')
            //
            // console.log('админ-статус = 1')

            // Функция для обработки входящего сообщения
            const messageHandler = async (msg) => {
                console.log('Зашли в messageHandler');
                userContext[chatId].awaitingResponse = true;
                if (msg.chat.id === chatId && userContext[chatId].awaitingResponse) {
                    const enteredNewTitle = msg.text;

                    try {
                        // Выполнение запроса к базе данных для обновления названия
                        await connection.execute('DELETE FROM orders_notification WHERE telegram_id = ?', [enteredNewTitle]);

                        // Отправляем сообщение об успешном обновлении названия
                        await bot.sendMessage(chatId, 'Айди был удалён: ' + enteredNewTitle);

                    } catch (error) {
                        console.error('Ошибка выполнения запроса: ' + error.stack);
                        await bot.sendMessage(chatId, 'Произошла ошибка при выполнении запроса к базе данных.');
                    } finally {
                        // Возвращаем администратора в админское меню
                        await admin_panel(msg);
                        // Возвращаем соединение в пул
                        connection.release();
                        console.log('Закрытие соединения с базой данных');
                        // Удаляем обработчик сообщений
                        bot.off('message', messageHandler);

                        // await connection.execute('UPDATE admin_status SET status = 0 WHERE id = 1')
                        // console.log('админ-статус = 0');

                        userContext[chatId].awaitingResponse = false;
                    }
                }
            };

            // Подписываемся на обработку входящих сообщений
            bot.on('message', messageHandler);
            userContext[chatId].awaitingResponse = false;
        } catch (error) {
            console.log(error);
        }
        finally {
            userContext[chatId].awaitingResponse = false;
        }
    }

})



// Функция для выполнения запросов к базе данных с использованием пула соединений
// async function executeQuery(query) {
//     let connection; // Определяем переменную connection здесь
//
//     try {
//         // Получаем соединение из пула
//         connection = await pool.getConnection();
//         console.log('Подключение к базе данных успешно установлено!');
//
//         // Выполняем запрос к базе данных
//         const [results] = await connection.execute(query);
//
//         // Возвращаем результат запроса
//         return results;
//     } catch (error) {
//         console.error('Ошибка выполнения запроса: ' + error.stack);
//         throw error;
//     } finally {
//         if (connection) {
//             // Возвращаем соединение в пул
//             connection.release();
//         }
//     }
// }

async function get_title(chatId) {
    try {
        const connection = await pool.getConnection();
        console.log('Подключение к базе данных успешно установлено!');

        const results = await connection.execute('SELECT title FROM Learn_src');

        connection.release();
        console.log('Соединение с бд закрыто');

        if (results.length === 0) {
            await bot.sendMessage(chatId, 'Ошибка: кнопки не найдены.');
            return [];
        }

        const keyboardButtons = results[0].map(row => row.title);

        console.log('Кнопки:', keyboardButtons);

        return keyboardButtons;
    } catch (error) {
        console.error('Ошибка при выполнении запроса в get_title():', error.stack);
        return [];
    }
}


// async function checkAdminStatus() {
//     try {
//         const connection = await pool.getConnection();
//
//         const result = await connection.execute('SELECT status FROM admin_status WHERE id = 1');
//
//         console.log(result[0].status);
//         connection.release();
//     } catch (error) {
//         console.error('Ошибка при проверке статуса администратора:', error);
//         return true; // В случае ошибки считаем статус администратора отключенным
//     }
// }


// Вызов функции для проверки статуса администратора


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Проверяем, является ли сообщение от администратора
    //     try {
    //         const connection = await pool.getConnection();
    //         await connection.execute('UPDATE admin_status SET status = 0 WHERE status = 1');
    //         console.log('Статус администратора теперь 0(пользователь)');
    //         connection.release();
    //     } catch (error) {
    //         console.error('Ошибка при проверке статуса администратора:', error);
    //     } finally {
    //     }

        // Обработка сообщений от обычных пользователей
    const keyboardButtons = await get_title(chatId);

    if (keyboardButtons.includes(messageText)) {
        // Обрабатываем нажатие кнопки в соответствии с ее текстом
        switch (messageText) {
            case keyboardButtons[0]:
                await handleButtonPress(chatId, 0);
                console.log('press by ' + keyboardButtons[0])
                break;
            case keyboardButtons[1]:
                await handleButtonPress(chatId, 1);
                console.log('press by ' + keyboardButtons[1])
                break;
            case keyboardButtons[2]:
                await handleButtonPress(chatId, 2);
                console.log('press by ' + keyboardButtons[2])
                break;
            // Добавьте обработчики для других кнопок при необходимости
            default:
                break;
        }
    }
});

async function handleButtonPress(chatId, buttonId, fromAdminPanel = false) {
    try {
        const connection = await pool.getConnection();
        console.log('Подключение к базе данных успешно установлено!');
        const results = await connection.execute(`SELECT src FROM Learn_src`);
        console.log(results)
        if(buttonId === 0) {
            const results = await connection.execute("SELECT src FROM Learn_src WHERE id = 1");
            if (results.length === 0) {
                console.error('Нет данных для идентификатора 1');
            } else {
                const link = results[0].map(row => row.src);
                console.log('Ссылка для идентификатора 1:', link);
                await bot.sendMessage(chatId, 'Ссылка на чат с менеджером: ' + link);
                await access(chatId)
            }
        }
        else if(buttonId === 1) {
            const results = await  connection.execute(`SELECT src FROM Learn_src WHERE id = 2`);
            if (results.length === 0) {
                console.error('Нет данных для идентификатора 2');
            } else {
                const link = results[0].map(row => row.src);
                console.log('Ссылка для идентификатора 2:', link);
                await bot.sendMessage(chatId, 'Ссылка на чат с менеджером: ' + link);
                await access(chatId)
            }
        }

        else if(buttonId === 2) {
            const results = await  connection.execute(`SELECT src FROM Learn_src WHERE id = 3`);
            if (results.length === 0) {
                console.error('Нет данных для идентификатора 3');
            } else {
                const link = results[0].map(row => row.src);
                console.log('Ссылка для идентификатора 3:', link);
                await bot.sendMessage(chatId, 'Ссылка на чат с менеджером: ' + link);
                await access(chatId)
            }
        }



    } catch (error) {
        console.error('Ошибка при обработке нажатия кнопки:', error);
        if (!fromAdminPanel) {
            await bot.sendMessage(chatId, 'Произошла ошибка при выполнении операции.');
        }
    }
}



bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const userId = msg.from.id;

    // Инициализируем userContext[userId], если он еще не был инициализирован
    if (!userContext[userId]) {
        userContext[userId] = {};
    }

    if (userContext[userId].awaitingResponse) {
        // Обрабатываем ответ пользователя
        // Например, сохраняем ответ в базе данных и выполняем необходимые действия
        userContext[userId].awaitingResponse = false; // Сбрасываем флаг ожидания ответа
        // Ваша логика для обработки ответа пользователя
    } else {
        if (chatId === userId) {
            if (commandHandlers[messageText]) {
                // Вызываем соответствующий обработчик
                commandHandlers[messageText](msg); // Используем объект msg вместо chatId
            } else {
            }
        } else {
            // Обработка случаев, когда сообщение не приходит от ожидаемого пользователя
            await bot.sendMessage(userId, 'Это сообщение адресовано другому пользователю и не может быть обработано.');
            console.log(`Попытка использования чужого аккаунта: сообщение от пользователя с ID ${userId}, но с chatId ${chatId}.`);
        }
    }
});