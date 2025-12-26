import React, { useState } from 'react';
import axios from 'axios';
import './GallerySelector.css';

const GallerySelector = ({ selectedGallery, onSelect }) => {
    const [mode, setMode] = useState('preset'); // 'preset' or 'search'
    const [keyword, setKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const presets = [
        { id: 'owgenji', name: 'Overwatch Genji' },
        { id: 'overwatch2', name: 'Overwatch 2' },
        { id: 'overwatch2_tv', name: 'Overwatch 2 TV' },
    ];

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setIsSearching(true);
        setSearchResults([]); // Clear previous results to avoid confusion
        try {
            const response = await axios.get(`http://localhost:8000/galleries/search`, {
                params: { keyword: keyword }
            });
            setSearchResults(response.data);
        } catch (error) {
            console.error("Gallery search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="gallery-selector">
            <div className="mode-toggle">
                <button
                    className={mode === 'preset' ? 'active' : ''}
                    onClick={() => setMode('preset')}
                >
                    추천 갤러리
                </button>
                <button
                    className={mode === 'search' ? 'active' : ''}
                    onClick={() => setMode('search')}
                >
                    갤러리 검색
                </button>
            </div>

            {mode === 'preset' ? (
                <div className="button-group">
                    {presets.map((gallery) => (
                        <button
                            key={gallery.id}
                            className={`gallery-btn ${selectedGallery === gallery.id ? 'active' : ''}`}
                            onClick={() => onSelect(gallery.id)}
                        >
                            {gallery.name}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="gallery-search-container">
                    <form onSubmit={handleSearch} className="gallery-search-form">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="갤러리 이름 검색 (예: 오버워치)"
                        />
                        <button type="submit" disabled={isSearching}>
                            {isSearching ? '...' : '검색'}
                        </button>
                    </form>

                    <div className="gallery-results">
                        {searchResults.length > 0 ? (
                            searchResults.map((gal) => (
                                <button
                                    key={gal.id}
                                    className={`gallery-result-btn ${selectedGallery === gal.id ? 'active' : ''}`}
                                    onClick={() => onSelect(gal.id)}
                                >
                                    <span className="gal-name">{gal.name}</span>
                                    <span className="gal-id">({gal.id})</span>
                                </button>
                            ))
                        ) : (
                            keyword && !isSearching && <div className="no-results">검색 결과가 없습니다.</div>
                        )}
                    </div>
                </div>
            )}

            <div className="current-selection">
                현재 선택된 갤러리 ID: <strong>{selectedGallery}</strong>
            </div>
        </div>
    );
};

export default GallerySelector;
