import xml.etree.ElementTree as ET
import requests
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Cache variables to avoid hitting Google's servers too aggressively and to speed up loads
feed_cache = None
cache_time = 0

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_elem in root.findall('atom:entry', ns):
            title = entry_elem.find('atom:title', ns)
            title_text = title.text if title is not None else ""
            
            id_elem = entry_elem.find('atom:id', ns)
            id_text = id_elem.text if id_elem is not None else ""
            
            updated = entry_elem.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ""
            
            link_elem = entry_elem.find("atom:link[@rel='alternate']", ns)
            if link_elem is None:
                link_elem = entry_elem.find("atom:link", ns)
            link_href = link_elem.get('href') if link_elem is not None else ""
            
            content = entry_elem.find('atom:content', ns)
            content_text = content.text if content is not None else ""
            
            entries.append({
                'title': title_text,
                'id': id_text,
                'updated': updated_text,
                'link': link_href,
                'content': content_text
            })
        return {'status': 'success', 'data': entries}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def releases():
    result = fetch_and_parse_feed()
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
