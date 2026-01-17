import os
import io
import uuid
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2 
import mysql.connector 

# 1. Load Env
load_dotenv()

app = FastAPI()

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. AI Client
api_key = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=api_key)

# --- 4. MARIADB CONNECTION SETUP ---
DB_CONFIG = {
    'host': 'localhost',      
    'user': 'root',           
    'password': 'code@66',   # <--- Make sure this matches your install!
    'port': 3306,
    'auth_plugin': 'mysql_native_password' # <--- THIS IS THE CRITICAL FIX
}

def get_db_connection():
    # Connect to Server (first without DB to ensure it exists)
    conn = mysql.connector.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        port=DB_CONFIG['port'],
        auth_plugin=DB_CONFIG['auth_plugin'] # <--- Using the fix here
    )
    cursor = conn.cursor()
    
    # Create Database if not exists
    cursor.execute("CREATE DATABASE IF NOT EXISTS exam_db")
    
    # Connect to the specific database now
    conn.database = "exam_db"
    
    # Create Table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quizzes (
            id VARCHAR(36) PRIMARY KEY,
            topic VARCHAR(255),
            questions TEXT
        )
    """)
    return conn

# Initialize DB on startup
try:
    conn = get_db_connection()
    conn.close()
    print("✅ Successfully connected to MariaDB!")
except Exception as e:
    print(f"❌ Error connecting to MariaDB: {e}")
    print("Did you start the MariaDB Server? Is the password correct?")

# --- HELPER FUNCTIONS ---

def extract_text_from_pdf(file_bytes):
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text[:15000] 

def call_ai_generator(context_text, count, q_type):
    prompt = f"""
    Act as a strict teacher. 
    Generate {count} Medium level {q_type} questions based on this text:
    "{context_text}"
    Strictly output a JSON object with a key "questions" which is a list of strings.
    Example: {{ "questions": ["Q1...", "Q2..."] }}
    """
    completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
    )
    return json.loads(completion.choices[0].message.content)

# --- SAVE TO MARIADB ---
def save_to_mariadb(topic, questions_list):
    quiz_id = str(uuid.uuid4())
    questions_json = json.dumps(questions_list) 
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = "INSERT INTO quizzes (id, topic, questions) VALUES (%s, %s, %s)"
    val = (quiz_id, topic, questions_json)
    
    cursor.execute(sql, val)
    conn.commit()
    conn.close()
    
    return {"id": quiz_id, "questions": questions_list}

# --- ENDPOINTS ---
class QuestionRequest(BaseModel):
    topic: str
    count: int
    type: str

@app.post("/api/generate")
async def generate_from_topic(request: QuestionRequest):
    data = call_ai_generator(request.topic, request.count, request.type)
    return save_to_mariadb(request.topic, data["questions"])

@app.post("/api/generate-pdf")
async def generate_from_pdf(
    file: UploadFile = File(...),
    count: int = Form(5),
    type: str = Form("Short Answer")
):
    try:
        content = await file.read()
        extracted_text = extract_text_from_pdf(content)
        data = call_ai_generator(extracted_text, count, type)
        return save_to_mariadb("Uploaded PDF", data["questions"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quiz/{quiz_id}")
async def get_quiz(quiz_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = "SELECT questions FROM quizzes WHERE id = %s"
    val = (quiz_id,)
    
    cursor.execute(sql, val)
    result = cursor.fetchone()
    conn.close()
    
    if result:
        questions = json.loads(result[0])
        return {"id": quiz_id, "questions": questions}
    else:
        raise HTTPException(status_code=404, detail="Quiz not found")