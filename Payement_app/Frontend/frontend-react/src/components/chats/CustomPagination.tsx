import Pagination from "react-bootstrap/Pagination";

interface Props {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export default function CustomPagination({ currentPage, pageCount, onPageChange }: Props) {
  const paginationItems = [];

  // Helper to add page item
  const addPage = (page: number, isActive = false, isDisabled = false) => {
    paginationItems.push(
      <Pagination.Item
        key={page}
        active={isActive}
        disabled={isDisabled}
        onClick={() => !isDisabled && onPageChange(page)}
      >
        {page}
      </Pagination.Item>
    );
  };

  // Always show first page
  addPage(1, currentPage === 1);

  // Show ellipsis if needed
  if (currentPage > 3) {
    paginationItems.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
  }

  // Middle pages
  for (let page = Math.max(2, currentPage - 1); page <= Math.min(pageCount - 1, currentPage + 1); page++) {
    addPage(page, page === currentPage);
  }

  // Show ellipsis before last page if needed
  if (currentPage < pageCount - 2) {
    paginationItems.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
  }

  // Always show last page if more than 1
  if (pageCount > 1) {
    addPage(pageCount, currentPage === pageCount);
  }

  return (
    <Pagination>
      <Pagination.First onClick={() => onPageChange(1)} disabled={currentPage === 1} />
      <Pagination.Prev onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} />

      {paginationItems}

      <Pagination.Next onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === pageCount} />
      <Pagination.Last onClick={() => onPageChange(pageCount)} disabled={currentPage === pageCount} />
    </Pagination>
  );
}
