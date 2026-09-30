const API_URL = "http://localhost:5000/api/tasks"; // относительный путь: Nginx будет проксировать или бэкенд будет доступен по домену

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "'");
}

async function loadTasks() {
    const list = document.querySelector('#task-list');
    if (!list) {
        console.error('Не найден элемент #task-list');
        return;
    }

    try {
        const res = await fetch(API_URL, { method: 'GET' });
        if (!res.ok) throw new Error('Ошибка загрузки задач: ' + res.status);
        
        const tasks = await res.json();
        list.innerHTML = ''; // Очищаем список

    tasks.forEach(task => {
   	 const li = document.createElement('li');
   	 const toggleText = task.completed ? 'Сделать активной' : 'Завершить';
   	 const timeText = task.time_adding 
       	     ? new Date(task.time_adding).toLocaleString() 
       	     : 'Без времени';

    	li.innerHTML = `
            <span>${escapeHtml(task.title)}</span>
            <small>(${timeText})</small>
            <button class="toggle" data-id="${task.id}" data-completed="${task.completed}">${toggleText}</button>
            <button class="delete" data-id="${task.id}">Удалить</button>
    	`;
    	list.appendChild(li);
    });
    } catch (err) {
        console.error('Ошибка при загрузке задач:', err);
    }
}

async function addTask() {
    const input = document.getElementById("task-input");
    const title = input.value.trim();
    if (!title) return;

    await fetch(API_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({title})
    });

    input.value = "";
    loadTasks();
}


async function deleteTask(id) {
    console.log('DeleteTask, ID:',id);
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadTasks(); // Перезагружаем список после удаления
        } else {
            alert('Ошибка при удалении задачи');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleTask(id) {
    console.log('ToggleTask, ID:',id);
    const btn = document.querySelector(`button.toggle[data-id="${id}"]`);
    if(!btn)return;
    const currentStatus = btn.dataset.completed === 'true';
    const newStatus = !currentStatus
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH', // Или PUT, зависит от вашего бэкенда
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed: newStatus })  
                                                     // Если нужна инверсия, логику нужно усложнить.
        });

        if (response.ok) {
            loadTasks(); // Обновляем список
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById("add-btn").addEventListener("click", addTask);
document.getElementById("task-input").addEventListener("keypress", e => {
    if (e.key === "Enter") addTask();
});

const list = document.getElementById('task-list'); // Замените на ваш ID списка

list.addEventListener('click', (event) => {
    const btn = event.target.closest('button'); // Находим ближайшую кнопку
    
    if (!btn) return; // Если клик был не по кнопке

    const taskId = btn.dataset.id; // Получаем ID задачи из атрибута data-id

    if (btn.classList.contains('delete')) {
        deleteTask(taskId);
    } 
    else if (btn.classList.contains('toggle')) {
        toggleTask(taskId);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const list = document.getElementById('task-list');
    console.log('✅ Элемент #task-list:', list); // Должно вывести <ul>...</ul>, а не null

    if (list) {
        console.log('🎯 Вешаем делегирование событий на #task-list');
        list.addEventListener('click', (event) => {
            const btn = event.target.closest('button');
            if (!btn) return;

            const taskId = btn.dataset.id;
            console.log('🖱️ Клик по кнопке:', btn.className, 'ID задачи:', taskId);

            if (btn.classList.contains('delete')) {
                deleteTask(taskId);
            } else if (btn.classList.contains('toggle')) {
                toggleTask(taskId);
            }
        });
    } else {
        console.error('❌ Элемент #task-list не найден! Проверьте HTML.');
    }

    // Также вешаем обработчики на кнопку добавления
    const addBtn = document.getElementById('add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addTask);
    } else {
        console.error('❌ Кнопка #add-btn не найдена!');
    }
});

// Загрузка при старте
loadTasks();
