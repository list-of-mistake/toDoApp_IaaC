from flask import Flask, request, jsonify
import psycopg2
from flask_cors import CORS
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)

def get_db_connection():
    """Подключение к БД. Имя хоста 'db' — это имя сервиса в docker-compose."""
    conn = psycopg2.connect(
        host="localhost",
        dbname="todo",
        user="todo_user",
        password="pass"
    )
    return conn

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, title, completed, time_adding FROM tasks ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    tasks = []
    for row in rows:
        task_id, title, completed, time_adding_dt = row
        try:
            time_str = time_adding_dt.isoformat() if time_adding_dt else None
        except:
            time_str = str(time_adding_dt)
        tasks.append({
            "id": row["id"],
            "title": row["title"],
            "completed": row["completed"],
            "time_adding": row["time_adding"]
        })
    return jsonify(tasks)

@app.route("/api/tasks/<int:task_id>",methods = ["GET", "DELETE"])
def task_detail(task_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    if request.method == 'GET':
        cur.execute("SELECT id, title, completed,time_adding FROM tasks WHERE id = %s",(task_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return jsonify({"error":"task not found"}),404

        time_str = row["time_adding"].isoformat() if row["time_adding"] else None
        return jsonify({
	    "id": row["id"],
	    "title": row["title"],
	    "completed": row["completed"],
	    "time_adding": time_str
        })
    elif request.method == 'DELETE':
        if cur.rowcount == 0:
            return jsonify({"error": "Задача не найдена"}), 404
        cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        cur.close()
        conn.close()

        return "", 204

@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json()
    if not data or "title" not in data:
        return jsonify({"error": "Поле 'title' обязательно"}), 400

    title = data["title"]
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        "INSERT INTO tasks (title, completed) VALUES (%s, %s) RETURNING id, title, completed, time_adding",
        (title, False)
    )
    new_task = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify(new_task), 201

@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Нет данных"}), 400

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Если передан completed — обновляем его
    if "completed" in data:
        cur.execute(
            "UPDATE tasks SET completed = %s WHERE id = %s RETURNING id, title, completed, time_adding",
            (data["completed"], task_id)
        )
    else:
        cur.execute(
            "UPDATE tasks SET title = %s WHERE id = %s RETURNING id, title, completed, time_adding",
            (data.get("title"), task_id)
        )

    updated_task = cur.fetchone()
    if not updated_task:
        conn.close()
        return jsonify({"error": "Задача не найдена"}), 404

    conn.commit()
    cur.close()
    conn.close()
    return jsonify(updated_task)

if __name__ == "__main__":
    # host=0.0.0.0 нужен, чтобы контейнер был доступен снаружи
    app.run(host="0.0.0.0", port=5000)
