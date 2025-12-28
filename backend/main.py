import sys
import os

# Fix for PyInstaller --windowed mode (no console)
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List, Optional
import re
import time

app = FastAPI()

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"DEBUG: Incoming Request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"DEBUG: Response Status: {response.status_code}")
    return response

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Post(BaseModel):
    title: str
    link: str
    date: str
    writer: str
    recommend: str
    views: str

class GalleryResponse(BaseModel):
    id: str
    name: str

class SearchResponse(BaseModel):
    posts: List[Post]
    next_search_pos: Optional[str] = None

# Gallery ID mapping (Kept for reference or presets, but not strict validation)
GALLERY_URLS = {
    "owgenji": "https://gall.dcinside.com/mgallery/board/lists/?id=owgenji",
    "overwatch2": "https://gall.dcinside.com/mgallery/board/lists/?id=overwatch2",
    "overwatch2_tv": "https://gall.dcinside.com/mgallery/board/lists/?id=overwatch2_tv",
}

import concurrent.futures

def crawl_page(base_url, gallery_id, keyword, page, search_pos, headers):
    try:
        url = f"{base_url}?id={gallery_id}&s_type=search_subject_memo&s_keyword={keyword}&page={page}"
        if search_pos:
            url += f"&search_pos={search_pos}"
            
        print(f"DEBUG: Fetching Page {page}...")
        res = requests.get(url, headers=headers, timeout=5)
        
        if res.status_code != 200 or 'gall_list' not in res.text:
            return [], None

        soup = BeautifulSoup(res.content, 'lxml')
        
        # Parse posts
        tables = soup.select('table.gall_list')
        target_table = None
        for table in tables:
            if table.get('id') != 'kakao_seach_list':
                target_table = table
                break
        
        posts = []
        if target_table:
            rows = target_table.select('tr.ub-content')
            for row in rows:
                try:
                    num_cell = row.select_one('.gall_num')
                    if not num_cell or not num_cell.text.strip().isdigit():
                        continue

                    title_cell = row.select_one('.gall_tit a')
                    if not title_cell:
                        continue
                    
                    title = title_cell.text.strip()
                    link = "https://gall.dcinside.com" + title_cell['href']
                    
                    writer_cell = row.select_one('.gall_writer')
                    writer = writer_cell.text.strip() if writer_cell else "Unknown"
                    
                    date_cell = row.select_one('.gall_date')
                    date = date_cell.text.strip() if date_cell else ""
                    
                    rec_cell = row.select_one('.gall_recommend')
                    recommend = rec_cell.text.strip() if rec_cell else "0"
                    
                    view_cell = row.select_one('.gall_count')
                    views = view_cell.text.strip() if view_cell else "0"

                    posts.append(Post(
                        title=title,
                        link=link,
                        date=date,
                        writer=writer,
                        recommend=recommend,
                        views=views
                    ))
                except Exception:
                    continue

        # Extract next_search_pos
        next_pos = None
        next_btn = soup.select_one('a.search_next')
        if next_btn and 'href' in next_btn.attrs:
            match = re.search(r'search_pos=([^&]+)', next_btn['href'])
            if match:
                next_pos = match.group(1)
        
        return posts, next_pos
    except Exception as e:
        print(f"Error fetching page {page}: {e}")
        return [], None

def crawl_dc_gallery(gallery_id: str, keyword: str, page: int = 1, search_pos: str = None, limit: int = 1) -> SearchResponse:
    # 1. Determine correct base_url by probing
    base_urls = [
        "https://gall.dcinside.com/mgallery/board/lists/", # Minor
        "https://gall.dcinside.com/board/lists/",          # Main
        "https://gall.dcinside.com/mini/board/lists/",     # Mini
        "https://gall.dcinside.com/person/board/lists/"    # Person
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    correct_base_url = None
    
    # Probe to find correct URL type
    for base_url in base_urls:
        try:
            # Quick probe
            url = f"{base_url}?id={gallery_id}&s_type=search_subject_memo&s_keyword={keyword}&page={page}"
            if search_pos:
                url += f"&search_pos={search_pos}"
            
            res = requests.get(url, headers=headers, timeout=3)
            if res.status_code == 200 and 'gall_list' in res.text:
                correct_base_url = base_url
                break
        except:
            continue
            
    if not correct_base_url:
        print("DEBUG: Could not find valid gallery URL type")
        return SearchResponse(posts=[])

    # 2. Sequential Fetch with Session
    session = requests.Session()
    session.headers.update(headers)
    
    all_posts = []
    current_search_pos = search_pos
    current_page = 1 # Always start at page 1 for a new search block
    last_search_pos = None

    print(f"DEBUG: Starting Sequential Batch Fetch (Limit={limit}) on {correct_base_url}")

    for i in range(limit):
        print(f"DEBUG: Batch {i+1}/{limit}, search_pos={current_search_pos}")
        
        try:
            url = f"{correct_base_url}?id={gallery_id}&s_type=search_subject_memo&s_keyword={keyword}&page={current_page}"
            if current_search_pos:
                url += f"&search_pos={current_search_pos}"
            
            res = session.get(url, timeout=5)
            
            if res.status_code != 200 or 'gall_list' not in res.text:
                print(f"DEBUG: Failed to fetch or invalid response at batch {i+1}")
                break

            soup = BeautifulSoup(res.content, 'lxml')
            
            # Parse posts
            tables = soup.select('table.gall_list')
            target_table = None
            for table in tables:
                if table.get('id') != 'kakao_seach_list':
                    target_table = table
                    break
            
            iteration_posts = []
            if target_table:
                rows = target_table.select('tr.ub-content')
                for row in rows:
                    try:
                        num_cell = row.select_one('.gall_num')
                        if not num_cell or not num_cell.text.strip().isdigit():
                            continue

                        title_cell = row.select_one('.gall_tit a')
                        if not title_cell:
                            continue
                        
                        title = title_cell.text.strip()
                        link = "https://gall.dcinside.com" + title_cell['href']
                        
                        writer_cell = row.select_one('.gall_writer')
                        writer = writer_cell.text.strip() if writer_cell else "Unknown"
                        
                        date_cell = row.select_one('.gall_date')
                        date = date_cell.text.strip() if date_cell else ""
                        
                        rec_cell = row.select_one('.gall_recommend')
                        recommend = rec_cell.text.strip() if rec_cell else "0"
                        
                        view_cell = row.select_one('.gall_count')
                        views = view_cell.text.strip() if view_cell else "0"

                        iteration_posts.append(Post(
                            title=title,
                            link=link,
                            date=date,
                            writer=writer,
                            recommend=recommend,
                            views=views
                        ))
                    except Exception:
                        continue
            
            all_posts.extend(iteration_posts)

            # Extract next_search_pos for the NEXT iteration
            next_pos = None
            next_btn = soup.select_one('a.search_next')
            if next_btn and 'href' in next_btn.attrs:
                href = next_btn['href']
                match = re.search(r'search_pos=([^&]+)', href)
                if match:
                    next_pos = match.group(1)
            
            if next_pos:
                current_search_pos = next_pos
                last_search_pos = next_pos
            else:
                print("DEBUG: No next_search_pos found, stopping batch.")
                break
                
            time.sleep(0.1) # Micro-sleep

        except Exception as e:
            print(f"DEBUG: Error in batch {i+1}: {e}")
            break

    print(f"DEBUG: Sequential fetch complete. Total posts: {len(all_posts)}, Next Pos: {last_search_pos}")
    return SearchResponse(posts=all_posts, next_search_pos=last_search_pos)

# ... (crawl_gallery_search remains same)
def crawl_gallery_search(keyword: str) -> List[GalleryResponse]:
    search_url = f"https://search.dcinside.com/gallery/q/{keyword}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(search_url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')
        galleries = []
        
        links = soup.select('a.gallname_txt')
        
        for link in links:
            name = link.text.strip()
            href = link.get('href', '')
            
            match = re.search(r'id=([^&]+)', href)
            if match:
                gal_id = match.group(1)
                galleries.append(GalleryResponse(id=gal_id, name=name))
                
        return galleries
    except Exception as e:
        print(f"Gallery search failed: {e}")
        return []

@app.get("/search", response_model=SearchResponse)
def search_gallery(
    gallery_id: str, 
    keyword: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    search_pos: str = Query(None),
    limit: int = Query(1, ge=1, le=20) # Limit batch size (default 1, max 20)
):
    try:
        print(f"DEBUG: Processing search request for {gallery_id}, kw={keyword}, limit={limit}")
        # Pass limit to crawler
        results = crawl_dc_gallery(gallery_id, keyword, page, search_pos, limit)
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/galleries/search", response_model=List[GalleryResponse])
def search_galleries_endpoint(keyword: str = Query(..., min_length=1)):
    return crawl_gallery_search(keyword)

@app.get("/galleries")
def get_galleries():
    return [
        {"id": "owgenji", "name": "Overwatch Genji"},
        {"id": "overwatch2", "name": "Overwatch 2"},
        {"id": "overwatch2_tv", "name": "Overwatch 2 TV"},
    ]

# ... (Previous imports)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import webbrowser
import threading

# Serve Static Files (Frontend) using the existing 'app'
# relative path to the static folder (which contains the built React app)
static_dir = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow API calls to pass through
        if full_path.startswith("search") or full_path.startswith("galleries") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
             raise HTTPException(status_code=404, detail="Not Found")
        
        # Serve index.html for any other route (SPA support)
        # Check if a file exists in static (e.g. favicon.ico)
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    print("Static directory not found. Running in API-only mode.")

def open_browser():
    webbrowser.open("http://127.0.0.1:8000")

def create_tray_icon():
    """시스템 트레이 아이콘 생성"""
    from pystray import Icon, Menu, MenuItem
    from PIL import Image

    def load_icon_image():
        # PyInstaller 번들 경로 또는 일반 경로에서 아이콘 로드
        icon_path = os.path.join(static_dir, "dc_icon.png")
        if os.path.exists(icon_path):
            return Image.open(icon_path).resize((64, 64))
        # 폴백: 간단한 파란색 원
        from PIL import ImageDraw
        size = 64
        image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.ellipse([4, 4, size-4, size-4], fill='#3b82f6')
        return image

    def on_open_browser(icon, item):
        open_browser()

    def on_quit(icon, item):
        icon.stop()
        os._exit(0)

    menu = Menu(
        MenuItem("브라우저 열기", on_open_browser),
        MenuItem("종료", on_quit)
    )

    icon = Icon(
        "DC Crawler",
        load_icon_image(),
        "DC Crawler - by 별하솜",
        menu
    )

    return icon

def run_server():
    """서버를 별도 스레드에서 실행"""
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")

if __name__ == "__main__":
    # 서버를 백그라운드 스레드에서 시작
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # 브라우저 열기
    threading.Timer(1.5, open_browser).start()

    # 시스템 트레이 아이콘 실행 (메인 스레드에서)
    tray_icon = create_tray_icon()
    tray_icon.run()
