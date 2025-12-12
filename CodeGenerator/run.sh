#!/bin/bash
source venv/bin/activate

if lsof -i :5000 > /dev/null 2>&1; then
    echo "Порт 5000 занят — убиваем старый процесс..."
    sudo kill -9 $(sudo lsof -t -i:5000) 2>/dev/null || true
fi

echo "Запускаем CodeGen AI → http://127.0.0.1:5000"
python app.py
