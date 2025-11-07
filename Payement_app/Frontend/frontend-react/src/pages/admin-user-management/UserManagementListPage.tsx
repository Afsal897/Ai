import { ArrowDown, ArrowUp, Funnel } from "react-bootstrap-icons";
import EditUser from "@/components/admin-user-management/EditUser";
import { useEffect, useState } from "react";
import AddUser from "@/components/admin-user-management/AddUser";
import { User } from "@/services/user-management-service/userManagementType";
import { useDebounce } from "@/hooks/useDebounce";
import {
  blockUnblockUserById,
  getAllUsers,
} from "@/services/user-management-service/userManagementService";
import { Col, Form, InputGroup, Row, Table } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import BlockUnblockUser from "@/components/admin-user-management/BlockUnblockUser";
import { getCurentUser } from "@/utils/stringUtils";
import CustomPagination from "@/components/chats/CustomPagination";
import PageLoadingSpinner from "@/components/loaders/PageLoadingSpinner";
import OverlayLoader from "@/components/loaders/OverlayLoader";
import { userTypes } from "@/utils/formatters";

export default function UserManagementPage() {
  const { t } = useTranslation(); //i18n variable declaration

  // State hooks for managing user data and UI states
  const [users, setUsers] = useState<User[]>([]); // Store the list of users
  const [searchTerm, setSearchUser] = useState(""); // Search input value
  const [sortKey, setSortKey] = useState(""); // Sorting key for the table columns
  const [sortType, setSortType] = useState(true); // Sorting order (true: asc, false: desc)
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [pageCount, setPageCount] = useState(1); // Total number of pages for pagination
  const currentUser = getCurentUser();
  const [limit, setLimit] = useState(10); //Data per page
  const [role, setRole] = useState<number | "">(""); // user role
  const [status, setStatus] = useState<number | "">(""); // user status
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [isContactLoading, setIsContactLoading] = useState(false); //overlay loading state managamnet

  // Debounced search term to delay search request until user stops typing
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300 ms delay
  const statusKeyMap: Record<number, string> = {
    0: "inactive",
    1: "active",
    2: "deleted",
    3: "blocked",
  };
  // Fetch users from API with optional pagination, sorting, and filtering
  const handleGetUsers = (page = currentPage) => {
    const sortOrder = sortType ? "asc" : "desc"; // Determine sort order
    setIsContactLoading(true);
    getAllUsers(searchTerm, sortKey, sortOrder, page, limit, role, status)
      .then((res) => {
        setIsLoading(false);
        setIsContactLoading(false);
        if (res.items.length === 0 && currentPage > 1) {
          handleGetUsers(currentPage - 1);
        } else {
          setUsers(res.items);
          setCurrentPage(res.pager.page);
          setPageCount(res.pager.page_count);
        }
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  // Block or Unblock user handler, triggers API call
  const handleToggle = (id: number, currentStatus: number) => {
    let newStatus = currentStatus;
    // Toggle only if current status is active (1) or blocked (3)
    if (currentStatus === 1) {
      newStatus = 3; // block
    } else if (currentStatus === 3) {
      newStatus = 1; // unblock
    }

    const payload = { status: newStatus };

    blockUnblockUserById(id, payload)
      .then(() => {
        // Re-fetch users after the function, adjusting page if needed
        if (users.length === 1 && currentPage !== 1) {
          handleGetUsers(currentPage - 1);
        } else {
          handleGetUsers();
        }
      })
      .catch((err) => console.error(err));
  };

  // When search term changes, reset to page 1 or fetch directly if already on page 1
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      handleGetUsers(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, debouncedSearchTerm]);
  // Effect hook to fetch users and handle search term updates
  useEffect(() => {
    handleGetUsers(); // Fetch users initially or when dependencies change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortType, currentPage, role, status]);

  // Pagination handler, adjusts the current page
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  //data per page
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(Number(e.target.value));
  };

  // Handle changes to the user role filter
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!e.target.value) {
      setRole("");
      return;
    }

    setRole(Number(e.target.value));
    setCurrentPage(1);
  };

  // Handle changes to the user status filter
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!e.target.value) {
      setStatus("");
      return;
    }
    setStatus(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <>
      {isLoading ? (
        <PageLoadingSpinner />
      ) : (
        <OverlayLoader loading={isContactLoading}>
          <div className="container p-3 mt-4">
            <div className="d-flex flex-wrap justify-content-between mb-3">
              <div className="w-50">
                {/* Search */}
                <Form.Control
                  type="text"
                  placeholder={t("placeholders.search")}
                  className="mb-4 w-100"
                  onChange={(e) => setSearchUser(e.target.value)}
                />
              </div>

              <div>
                <Row className="g-3">
                  <Col xs="auto">
                    <InputGroup>
                      <InputGroup.Text>
                        <Funnel />
                      </InputGroup.Text>
                      <Form.Select
                        className="w-auto"
                        onChange={handleRoleChange}
                        value={role}
                      >
                        <option value="">{t("users.role.all")}</option>
                        <option value='0'>{t("users.role.admin")}</option>
                        <option value='1'>{t("users.role.user")}</option>
                        <option value='2'>Project Manager</option>
                        <option value='3'>Sales</option>
                        <option value='4'>Engineer</option>
                      </Form.Select>
                    </InputGroup>
                  </Col>
                  <Col xs="auto">
                    <InputGroup>
                      <InputGroup.Text>
                        <Funnel />
                      </InputGroup.Text>
                      <Form.Select
                        className="w-auto"
                        onChange={handleStatusChange}
                        value={status}
                      >
                        <option value="">{t("users.all")}</option>
                        <option value="0">{t("users.inActive")}</option>
                        <option value="1">{t("users.active")}</option>
                      </Form.Select>
                    </InputGroup>
                  </Col>
                  <Col xs="auto">
                    {/* Button to add a new user */}
                    <AddUser handleGetUsers={handleGetUsers} />
                  </Col>
                </Row>
              </div>
            </div>

            {/* Table displaying user information */}
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th
                    onClick={() => {
                      setSortKey("name");
                      setSortType((pre) => !pre); // Toggle sort order on column click
                    }}
                  >
                    {t("users.table.columnName")}
                    {sortKey === "name" &&
                      users.length > 0 &&
                      (sortType ? <ArrowUp /> : <ArrowDown />)}
                  </th>
                  <th
                    onClick={() => {
                      setSortKey("email");
                      setSortType((pre) => !pre);
                    }}
                  >
                    {t("users.table.columnEmail")}
                    {sortKey === "email" &&
                      users.length > 0 &&
                      (sortType ? <ArrowUp /> : <ArrowDown />)}
                  </th>
                  <th
                    onClick={() => {
                      setSortKey("role");
                      setSortType((pre) => !pre);
                    }}
                  >
                    {t("users.table.columnRole")}
                    {sortKey === "role" &&
                      users.length > 0 &&
                      (sortType ? <ArrowUp /> : <ArrowDown />)}
                  </th>
                  <th>{t("users.table.columStatus")}</th>
                  <th> {t("users.table.columnActions")}</th>
                </tr>
              </thead>

              <tbody>
                {/* Display message if no users are found */}
                {users.length == 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">
                      {t("users.table.emptyMessage")}
                    </td>
                  </tr>
                )}
                {/* Render users dynamically */}
                {users.map((user: User, index: number) => (
                  <tr key={index}>
                    <td>
                      <span
                        className="d-inline-block text-truncate"
                        style={{ maxWidth: 150 }}
                        title={user.name}
                      >
                        {user.name}
                      </span>
                    </td>

                    <td>{user.email}</td>
                    <td>
                      {userTypes(user.role)}
                    </td>
                    <td>{t(`users.status.${statusKeyMap[user.status]}`)}</td>
                    <td>
                      {/* Action buttons for viewing, editing, and deleting users */}
                      <div className="action-btns d-flex justfy-content-start  gap-2">
                        <EditUser
                          id={user.id}
                          handleGetUsers={handleGetUsers}
                        />
                        <BlockUnblockUser
                          name={user.name}
                          id={user.id}
                          status={user.status}
                          onToggle={handleToggle}
                          disabled={currentUser === user.email}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination controls */}
            {users.length > 0 && (
              <div className="row align-items-center">
                {/* Data per page dropdown */}
                <div className="col-md-6 d-flex align-items-center justify-content-center justify-content-md-start">
                  <span className="me-2">
                    {currentPage} {t("labels.of")} {pageCount}{" "}
                    {t("labels.pages")}:
                  </span>
                  <Form.Select
                    aria-label="Select rows per page"
                    style={{ width: "auto" }} // Keeps dropdown compact
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
                <div className="col-md-6 d-flex justify-content-md-end justify-content-center mt-2 mt-md-0">
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
