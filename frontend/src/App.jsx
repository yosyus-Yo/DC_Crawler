import { useState } from 'react';
import axios from 'axios';
import './App.css';
import dcIcon from './assets/dc_icon.png';
import GallerySelector from './components/GallerySelector';
import SearchBar from './components/SearchBar';
import PostList from './components/PostList';
import Pagination from './components/Pagination';

function App() {
  const [selectedGallery, setSelectedGallery] = useState('owgenji');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination State
  const [dcPage, setDcPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchPos, setSearchPos] = useState(null); // New state for DC search cursor



  const ITEMS_PER_PAGE = 10;

  const handleSearch = async (keyword, page = 1, pos = null) => {
    setIsLoading(true);
    setError(null);
    // Only clear posts if it is a fresh search (page 1 and no pos chain)
    if (page === 1 && !pos) setPosts([]);

    try {
      setCurrentKeyword(keyword);

      const response = await axios.get('http://localhost:8000/search', {
        params: {
          gallery_id: selectedGallery,
          keyword: keyword,
          page: page,
          search_pos: pos,
          limit: 10 // Sequential Batch: Fetch 10 blocks at once
        }
      });

      if (response.data.posts) {
        if (pos) {
          // If fetching via Next Search (pos exists), APPEND posts
          setPosts(prev => [...prev, ...response.data.posts]);
        } else {
          // New active search, REPLACE posts
          setPosts(response.data.posts);
        }
        setSearchPos(response.data.next_search_pos);
      } else {
        setPosts(response.data.posts || []);
      }

      setDcPage(page);
      setClientPage(1);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      setError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextSearch = () => {
    if (currentKeyword && searchPos) {
      // "Next Search" means fetch page 1 (of the new block) but with the new search_pos
      // Limit 10 is handled by handleSearch default call
      handleSearch(currentKeyword, 1, searchPos);
    } else {
      // Fallback if no searchPos (e.g. first page or first search), just try next page
      handleSearch(currentKeyword, dcPage + 1);
    }
  };

  const indexOfLastPost = clientPage * ITEMS_PER_PAGE;
  const indexOfFirstPost = indexOfLastPost - ITEMS_PER_PAGE;
  const currentPosts = posts.slice(indexOfFirstPost, indexOfLastPost);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <img src={dcIcon} alt="DC Crawler Logo" className="brand-logo" />
            <div className="brand-info">
              <h1>DC CRAWLER</h1>
              <span className="subtitle">INTELLIGENCE V1.0 <span className="watermark">by 별하솜</span></span>
            </div>
          </div>

          <div className="system-status">
            <div className="status-item">
              <span className="label">System</span>
              <span className="value active">ONLINE</span>
            </div>
            <div className="status-item">
              <span className="label">Ping</span>
              <span className="value">12ms</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <GallerySelector
          selectedGallery={selectedGallery}
          onSelect={setSelectedGallery}
        />

        <SearchBar
          onSearch={(k) => handleSearch(k, 1)}
          isLoading={isLoading}
        />

        {error && <div className="error-message">{error}</div>}

        {isLoading ? (
          <div className="loading-spinner">검색 중...</div>
        ) : (
          <>
            <PostList posts={currentPosts} viewMode="board" />
            {hasSearched && (
              <Pagination
                totalItems={posts.length}
                itemsPerPage={ITEMS_PER_PAGE}
                currentPage={clientPage}
                onPageChange={setClientPage}
                onNextSearch={handleNextSearch}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
