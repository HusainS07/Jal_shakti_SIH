🧰 2. Create a virtual environment
python -m venv venv


This creates a folder named venv/ that holds your isolated Python environment.

⚙️ 3. Activate the environment
🪟 On Windows:
venv\Scripts\activate

🐧 On Linux / macOS:
source venv/bin/activate


When activated, your terminal prompt will show something like:

(venv) $

📦 4. Install dependencies
pip install -r requirements.txt

🚀 5. Run the FastAPI server
uvicorn main:app --reload


Your ML backend will now run on
👉 http://localhost:8000








ml_backend/
│   ├── venv/                         # Virtual environment
│   ├── main.py
│   ├── models/                       # Folder for trained ML models (.pkl, .h5)
│   │   ├── extraction_model.pkl
│   │   └── future_model.pkl
│   ├── utils/                        # Helper functions (preprocessing, etc.)
│   │   └── preprocess.py
│   ├── requirements.txt              # Python dependencies
│   └── README.md