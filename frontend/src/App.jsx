import { useState } from 'react';
import axios from 'axios';
import './App.css';
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
  const [searchCount, setSearchCount] = useState(0); // 다음검색 횟수 추적



  const ITEMS_PER_PAGE = 10;

  const handleSearch = async (keyword, page = 1, pos = null) => {
    setIsLoading(true);
    setError(null);
    // Only clear posts if it is a fresh search (page 1 and no pos chain)
    if (page === 1 && !pos) {
      setPosts([]);
      setSearchCount(1); // 새 검색 시 1로 초기화
    } else {
      setSearchCount(prev => prev + 1); // 다음 검색 시 +1
    }

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
          <div>
            <h1>DC Gallery Crawler</h1>
            <p className="subtitle">Overwatch Community Search</p>
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
            {hasSearched && searchCount > 0 && (
              <div className="search-page-info">
                {((searchCount - 1) * 10) + 1}~{searchCount * 10}번 다음검색 페이지
              </div>
            )}
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
