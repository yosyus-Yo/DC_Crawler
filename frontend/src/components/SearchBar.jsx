import React, { useState } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, isLoading }) => {
    const [keyword, setKeyword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (keyword.trim()) {
            onSearch(keyword);
        }
    };

    return (
        <form className="search-bar" onSubmit={handleSubmit}>
            <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색어를 입력하세요 (예: 공지)"
                className="search-input"
                disabled={isLoading}
            />
            <button type="submit" className="search-btn" disabled={isLoading || !keyword.trim()}>
                {isLoading ? '검색 중...' : '검색'}
            </button>
        </form>
    );
};

export default SearchBar;
