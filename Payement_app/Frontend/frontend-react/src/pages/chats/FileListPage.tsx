import { ArrowDown, ArrowUp } from "react-bootstrap-icons";
import FileDownload from "@/components/chats/FileDownload";
import { useEffect, useState } from "react";
import AddFile from "@/components/chats/AddFile";
import { Files, fileTypes } from "@/services/file-service/fileType";
import { useDebounce } from "@/hooks/useDebounce";
import {
  downloadFileById,
  getAllFiles,
} from "@/services/file-service/fileServices";
import { Form, Table } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import PageLoadingSpinner from "@/components/loaders/PageLoadingSpinner";
import CustomPagination from "@/components/chats/CustomPagination";
import OverlayLoader from "@/components/loaders/OverlayLoader";
import { showConfirmDialog } from "@/utils/toastUtils";
import { formatDate, formatFileSize } from "@/utils/formatters";

export default function FileListPage() {
  const { t } = useTranslation(); // i18n translations

  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [files, setFiles] = useState([]); // List of files
  const [searchTerm, setSearchTerm] = useState(""); // Search input value
  const [sortKey, setSortKey] = useState("updated_at"); // Table sorting key
  const [sortType, setSortType] = useState(true); // Sorting order (true: asc, false: desc)
  const [currentPage, setCurrentPage] = useState(1); // Current pagination page
  const [pageCount, setPageCount] = useState(1); // Total pagination pages
  const [limit, setLimit] = useState(10); //Data per page
  const [isFileLoading, setIsFileLoading] = useState(false); //overlay loading state managamnet

  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounced search term (300 ms delay)
  const [isUploading, setIsUploading] = useState(false); // csv file upload loading

    // Fetch contacts from API with optional pagination, sorting, and filtering
    const handleGetFiles = (page = currentPage) => {
      const sortOrder = sortType ? "desc" : "asc"; // Determine sort order
      setIsFileLoading(true);
      getAllFiles(searchTerm, sortKey, sortOrder, page, limit)
        .then((res) => {
          setIsLoading(false);
          setIsFileLoading(false);
          if (res.items.length === 0 && currentPage > 1) {
            handleGetFiles(currentPage - 1);
          } else {
            setFiles(res.items);
            setCurrentPage(res.pager.page);
            setPageCount(res.pager.page_count);
          }
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
          setIsFileLoading(false);
        });
    };

  // file download api call
  const handleDownload = (id: number) => {
    setIsFileLoading(true);
    downloadFileById(id)
      .then(() => {
        handleGetFiles()
        showConfirmDialog({
          text: "File downloaded successfully",
          icon: "success",
          toast: true,
          showCancelButton: false,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: "top-end",
        });
      })
      .catch((err) => {
        console.error(err)
        showConfirmDialog({
          text: "File download failed",
          icon: "error",
          toast: true,
          showCancelButton: false,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          position: "top-end",
        });
      })
      .finally(()=>setIsFileLoading(false))
  };

  // Pagination handler, adjusts the current page
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    handleGetFiles(page);
  };

  //data per page
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
  };

  //rendering sort
  const renderSortIcon = (key: string) => {
    if (sortKey === key && files.length > 0) {
      return sortType ? <ArrowUp /> : <ArrowDown fontSize="small" />;
    }
    return null;
  };

  //handling colomn sorting
  const handleSort = (key: string) => {
    setSortKey(key);
    setSortType((prev) => !prev);
  };

  useEffect(() => {
        handleGetFiles();
  }, []);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      handleGetFiles(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, debouncedSearchTerm]);

  useEffect(() => {
    handleGetFiles(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sortKey, sortType]);

  return (
    <>
      {isLoading ? (
        <PageLoadingSpinner />
      ) : (
        <OverlayLoader loading={isFileLoading || isUploading}>
          <div className="container mt-5">
            <div className="d-flex justify-content-between">
              <div className="w-50">
                {/* Search and Add Contact Button */}
                <Form.Control
                  type="text"
                  placeholder={t("placeholders.search")}
                  className="mb-4"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} // Update search term on user input
                />
              </div>
              <div>
                {/* Button to add a new contact */}
                <AddFile handleGetFiles={handleGetFiles} setIsUploading={setIsUploading}/>
              </div>
            </div>

            {/* Table displaying contact information */}
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")}>
                    {t("contacts.table.columnName")}
                    {renderSortIcon("name")}
                  </th>
                  <th onClick={() => handleSort("size")}>
                    {t("contacts.table.columnSize")}
                    {renderSortIcon("size")}
                  </th>
                  <th onClick={() => handleSort("created_at")}>
                    {t("contacts.table.uploaded_at")}
                    {renderSortIcon("created_at")}
                  </th>
                  <th onClick={() => handleSort("status")}>
                    Status
                    {renderSortIcon("status")}
                  </th>
                  <th>
                    Meta Data
                  </th>
                  <th> {t("contacts.table.columnActions")}</th>
                </tr>
              </thead>

              <tbody>
                {/* Display message if no files are found */}
                {files.length == 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      {t("contacts.table.emptyMessage")}
                    </td>
                  </tr>
                )}

                {/* Render contacts dynamically */}
                {files.map((file: Files, index: number) => (
                  <tr key={index}>
                    <td>
                      <span
                        className="d-inline-block text-truncate"
                        style={{ maxWidth: 260 }}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{formatDate(file.created_at)}</td>
                    <td>{file.status}</td>
                    <td style={{ whiteSpace: "normal", wordWrap: "break-word", maxWidth:"350px" }}>
                      <div>Client Name: {file.client_name || "- -"}</div>
                      <div>File Type: {fileTypes(file.type) || "- -"}</div>
                      <div>Domain: {file.domain || "- -"}</div>
                      <div>
                        Technology: {file.technology?.length ? file.technology.join(", ") : "- -"}
                      </div>
                    </td>
                    <td>
                      {/* Action buttons for viewing, editing, and deleting contacts */}
                      <div className="action-btns d-flex justfy-content-start  gap-2">
                        <FileDownload
                          name={file.name}
                          id={file.id}
                          onDownload={handleDownload}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination controls */}
            {files.length > 0 && (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mt-3">
                {/* Rows per page */}
                <div className="d-flex align-items-center">
                  <span className="me-2">
                    {currentPage} {t("labels.of")} {pageCount}{" "}
                    {t("labels.pages")}:
                  </span>
                  <Form.Select
                    aria-label="Select rows per page"
                    style={{ width: "auto" }}
                    value={limit}
                    onChange={handleLimitChange}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </Form.Select>
                </div>

                {/* Pagination */}
                <div className="d-flex align-items-center mt-3">
                  <CustomPagination
                    currentPage={currentPage}
                    pageCount={pageCount}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            )}
          </div>
        </OverlayLoader>
      )}
    </>
  );
}
