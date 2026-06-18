from app import app

def main():
    print("Starting BigQuery Release Notes Dashboard...")
    app.run(debug=True, host='127.0.0.1', port=5000)


if __name__ == "__main__":
    main()

