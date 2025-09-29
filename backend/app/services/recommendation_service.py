# backend/app/services/recommendation_service.py (New File)
from googleapiclient.discovery import build
from app.core.config import YOUTUBE_API_KEY, PSE_API_KEY, PSE_CX

def search_youtube(query: str, max_results: int = 5):
    try:
        youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
        
        request = youtube.search().list(
            q=query,
            part='snippet',
            type='video',
            maxResults=max_results,
            videoCategoryId='27' # Category for Education
        )
        response = request.execute()

        videos = []
        for item in response.get('items', []):
            video_data = {
                "title": item['snippet']['title'],
                "link": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                "snippet": item['snippet']['description'],
                "thumbnail": item['snippet']['thumbnails']['high']['url']
            }
            videos.append(video_data)
        return videos
    except Exception as e:
        print(f"An error occurred with the YouTube API: {e}")
        return []

def search_web_articles(query: str, max_results: int = 5):
    try:
        service = build("customsearch", "v1", developerKey=PSE_API_KEY)
        
        res = service.cse().list(
            q=query,
            cx=PSE_CX,
            num=max_results,
        ).execute()

        articles = []
        for item in res.get('items', []):
            article_data = {
                "title": item.get('title'),
                "link": item.get('link'),
                "snippet": item.get('snippet'),
                # Use pagemap to get a thumbnail if available
                "thumbnail": (item.get('pagemap', {}).get('cse_thumbnail', [{}])[0].get('src') 
                              if item.get('pagemap') and item['pagemap'].get('cse_thumbnail') 
                              else None)
            }
            articles.append(article_data)
        return articles
    except Exception as e:
        print(f"An error occurred with the Custom Search API: {e}")
        return []