import React from 'react';
import './Pagination.css';

const Pagination = ({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    onNextSearch
}) => {
    const pageCount = Math.ceil(totalItems / itemsPerPage) || 1;
    const siblingCount = 2; // Number of pages to show around current page

    // Algorithm to generate pagination range with dots
    const paginationRange = () => {
        // 1. If page count is small (e.g., less than 7), show all pages
        // 1 2 3 4 5 6 7
        if (pageCount <= 7) {
            return Array.from({ length: pageCount }, (_, i) => i + 1);
        }

        // 2. Determine the range of visible pages around current page
        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, pageCount);

        // 3. Determine if dots are needed
        // show dots if there is more than 1 page gap from start/end
        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < pageCount - 1;

        const firstPageIndex = 1;
        const lastPageIndex = pageCount;

        // Case 1: No left dots, but right dots visible
        // 1 2 3 [4] 5 ... 100
        if (!shouldShowLeftDots && shouldShowRightDots) {
            let leftItemCount = 3 + 2 * siblingCount;
            let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
            return [...leftRange, '...', pageCount];
        }

        // Case 2: Left dots visible, but no right dots
        // 1 ... 96 [97] 98 99 100
        if (shouldShowLeftDots && !shouldShowRightDots) {
            let rightItemCount = 3 + 2 * siblingCount;
            let rightRange = Array.from({ length: rightItemCount }, (_, i) => pageCount - rightItemCount + 1 + i);
            return [firstPageIndex, '...', ...rightRange];
        }

        // Case 3: Both dots visible
        // 1 ... 4 [5] 6 ... 100
        if (shouldShowLeftDots && shouldShowRightDots) {
            let middleRange = Array.from(
                { length: rightSiblingIndex - leftSiblingIndex + 1 },
                (_, i) => leftSiblingIndex + i
            );
            return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
        }
    };

    const pages = paginationRange();

    const handleNextPage = () => {
        if (currentPage < pageCount) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePrev = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    return (
        <div className="pagination-wrapper">
            <div className="pagination-container">
                {/* Previous Button */}
                <button
                    className="nav-btn"
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                >
                    &lt;
                </button>

                {/* Page Numbers */}
                <div className="page-numbers">
                    {pages.map((page, index) => {
                        if (page === '...') {
                            return <span key={`dots-${index}`} className="pagination-dots">...</span>;
                        }

                        return (
                            <button
                                key={page}
                                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Next Page Button */}
                <button
                    className="nav-btn"
                    onClick={handleNextPage}
                    disabled={currentPage === pageCount}
                >
                    &gt;
                </button>
            </div>

            {/* Explicit Next Search Button - Separated */}
            <button className="next-search-btn" onClick={onNextSearch}>
                다음 검색 ↻
            </button>
        </div>
    );
};

export default Pagination;
