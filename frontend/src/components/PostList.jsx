import React from 'react';
import './PostList.css';

const PostList = ({ posts, viewMode = 'card' }) => {
    if (posts.length === 0) {
        return <div className="no-results">검색 결과가 없습니다.</div>;
    }

    const handlePostClick = (link) => {
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={`post-list-container ${viewMode}`}>
            <div className="post-list-header">
                <span className="col-title">제목</span>
                <span className="col-writer">글쓴이</span>
                <span className="col-date">날짜</span>
                <span className="col-views">조회</span>
                <span className="col-recommend">추천</span>
            </div>
            <div className="post-list">
                {posts.map((post, index) => (
                    <div key={index} className="post-item" onClick={() => handlePostClick(post.link)}>
                        <div className="post-title">{post.title}</div>
                        <div className="post-writer">{post.writer}</div>
                        <div className="post-date">{post.date}</div>
                        <div className="post-views">{post.views}</div>
                        <div className="post-recommend">{post.recommend}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PostList;
