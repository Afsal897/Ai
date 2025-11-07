import { getAllDeatils } from "@/services/admin-dashboard-service/adminDashboardService";

import { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
// Example icons (can be replaced with Material icons if you prefer)
import { FaUsers, FaUserCheck } from "react-icons/fa";

export default function DashboardPage() {
  const { t } = useTranslation(); //i18n variable declaration
  // Dashboard count states (fetched from API)
  const [userCount, setUserCount] = useState(0); // Total users count
  const [activeUserCount, setActiveUserCount] = useState(0); // Total active users count

  // Fetch Details to show in dashboard
  const handleGetDetails = () => {
    getAllDeatils()
      .then((res) => {
        setUserCount(res.user_count);
        setActiveUserCount(res.active_user_count);
      })
      .catch((err) => console.error(err));
  };

  // Effect hook to fetch users details (runs once)
  useEffect(() => {
    handleGetDetails();
  }, []);

  return (
    <div className="container py-4 mt-5">
      <div className="row g-4 justify-content-center">
        <div className="col-md-4">
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body>
              <div className="mb-3 fs-1 text-primary">
                <FaUsers />
              </div>
              <Card.Title>{t("adminDashboard.userCount")}</Card.Title>
              <Card.Text className="fs-3 fw-bold mb-0">{userCount}</Card.Text>
            </Card.Body>
          </Card>
        </div>

        <div className="col-md-4">
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body>
              <div className="mb-3 fs-1 text-info">
                <FaUserCheck />
              </div>
              <Card.Title>{t("adminDashboard.activeUserCount")}</Card.Title>
              <Card.Text className="fs-3 fw-bold mb-0">
                {activeUserCount}
              </Card.Text>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
