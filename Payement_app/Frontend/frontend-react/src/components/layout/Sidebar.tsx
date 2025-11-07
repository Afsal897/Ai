import { NavLink, useNavigate } from "react-router-dom";
import { Button, Nav, Offcanvas } from "react-bootstrap";
import { useEffect, useState } from "react";
import {
  People,
  Person,
  Speedometer2,
  BoxArrowRight,
} from "react-bootstrap-icons";
import InfiniteScroll from "react-infinite-scroll-component";
import { useTranslation } from "react-i18next";

import "./Sidebar.css";
import "../../App.css";
import { useMyContext } from "@/context/ContactContext";
import { getUserRole } from "@/utils/stringUtils";
import UserProfileImage from "../user/UserProfileImage";
import { useSessionContext } from "@/context/SessionContext";
import LoadingSpinner from "../loaders/LoadingSpinner";
import AlwaysScrollIntoView from "./AlwaysScrollIntoView";
import { PiFilesLight } from "react-icons/pi";
import { FaRegEdit } from "react-icons/fa";

interface SidebarProps {
  show: boolean;
  closeSidebar: () => void;
}

const Sidebar = ({ show, closeSidebar }: SidebarProps) => {
  const { t } = useTranslation();
  const { handleLogout, user } = useMyContext();
  const { sessions, fetchSessions, createNewSession, totalSessions } =
    useSessionContext();
  const navigate = useNavigate();

  // Role check
  const role = getUserRole();
  const isAdmin = role === "0" || role === "admin";

  // Pagination state
  const limit = 10;
  const [page, setPage] = useState(1);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [scrollToTop, setScrollToTop] = useState(true);

  // Initial fetch
  useEffect(() => {
    try {
      setIsSessionLoading(true);
      fetchSessions(1, limit);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  // Create new session
  const handleCreateSession = async () => {
    const newSession = await createNewSession();
    if (newSession) {
      setScrollToTop(true); //scroll to top
      navigate(`/sessions/${newSession.id}`);
    }
  };

  useEffect(() => {
    setScrollToTop(false);
  }, [scrollToTop]);

  // Load more sessions when scrolling
  const loadMoreSessions = async () => {
    const nextPage = page + 1;
    await fetchSessions(nextPage, limit);
    setPage(nextPage);
  };

  const renderNavLinks = () => (
    <Nav
      className="flex-column d-flex align-items-center gap-2 w-100"
      style={{ height: "calc(100vh - 80px)" }}
    >
      {/* User info */}
      <div className="d-flex justify-content-start align-items-center gap-2 w-100 custom-user-profile">
        <UserProfileImage
          previewUrl={user?.image_url ?? null}
          height={50}
          width={50}
        />
        <div className="max-w-100 overflow-hidden text-truncate">
          {user?.name}
        </div>
      </div>

      {/* Admin links */}
      {isAdmin && (
        <>
          <div className="d-flex justify-content-center w-100">
            <NavLink
              to="/admin-dashboard"
              className={({ isActive }) =>
                `custom-nav-link ${isActive && "custom-nav-link-active"}`
              }
            >
              <Speedometer2 /> {t("sidebar.dashboard")}
            </NavLink>
          </div>
          <div className="d-flex justify-content-center w-100">
            <NavLink
              to="/user-management"
              className={({ isActive }) =>
                `custom-nav-link ${isActive && "custom-nav-link-active"}`
              }
            >
              <People /> {t("sidebar.userManagement")}
            </NavLink>
          </div>
          <div className="d-flex justify-content-center w-100">
            <NavLink
              to="/files"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `custom-nav-link ${isActive && "custom-nav-link-active"}`
              }
            >
              <PiFilesLight /> {t("sidebar.fileList")}
            </NavLink>
          </div>
        </>
      )}

      {/* Profile */}
      <div className="d-flex justify-content-center w-100">
        <NavLink
          to="/user-profile"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `custom-nav-link ${isActive && "custom-nav-link-active"}`
          }
        >
          <Person /> {t("sidebar.myProfile")}
        </NavLink>
      </div>

      {/* Sessions for non-admin */}
      {!isAdmin && (
        <>
          <div className="d-flex justify-content-center w-100">
            <Button
              variant="light"
              className="d-flex align-items-center gap-2 w-100 px-3 py-2 nav-link"
              onClick={handleCreateSession}
            >
              <FaRegEdit />
              {t("sidebar.newChat")}
            </Button>
          </div>

          <div id="scrollableDiv" className="sessions-container">
            <div className="sessions-header mb-2">
              <h5>{t("sidebar.sessions")}</h5>
            </div>
            {isSessionLoading && sessions.length === 0 ? (
              <p>Loading sessions...</p>
            ) : sessions.length > 0 ? (
              <InfiniteScroll
                dataLength={sessions.length}
                next={loadMoreSessions}
                hasMore={page < totalSessions}
                loader={
                  <p className="text-center">
                    <LoadingSpinner />
                  </p>
                }
                endMessage={<p className="text-center">No more sessions</p>}
                height={"38vh"}
                scrollableTarget="scrollableDiv"
              >
                {scrollToTop && <AlwaysScrollIntoView />}

                <ul className="list-unstyled sessions-list">
                  {sessions.map((session) => (
                    <li
                      key={session.id}
                      className="mb-2 d-flex align-items-center"
                    >
                      <NavLink
                        to={`/sessions/${session.id}`}
                        onClick={closeSidebar}
                        className={({ isActive }) =>
                          `custom-nav-link d-flex align-items-center text-truncate ${
                            isActive ? "custom-nav-link-active" : ""
                          }`
                        }
                        title={session.name}
                        style={{ maxWidth: "170px" }}
                      >
                        <span className="text-truncate">
                          {session.name} {session.id}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </InfiniteScroll>
            ) : (
              <p>No sessions found</p>
            )}
          </div>
        </>
      )}

      {/* Logout */}
      <div
        className="d-flex justify-content-center w-100 mt-auto"
        style={{ bottom: 0 }}
      >
        <Button
          variant="light"
          onClick={handleLogout}
          className="d-flex align-items-center gap-2 w-100 px-3 py-2 text-danger nav-link"
        >
          <BoxArrowRight /> {t("account.logout")}
        </Button>
      </div>
    </Nav>
  );

  return (
    <>
      {/* Offcanvas sidebar (mobile) */}
      <Offcanvas
        show={show}
        onHide={closeSidebar}
        className="d-md-none w-75"
        responsive="lg"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{t("app.header")}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderNavLinks()}</Offcanvas.Body>
      </Offcanvas>

      {/* Static sidebar (desktop) */}
      <aside className="sidebar d-none d-md-block p-2 bg-light">
        {renderNavLinks()}
      </aside>
    </>
  );
};

export default Sidebar;
