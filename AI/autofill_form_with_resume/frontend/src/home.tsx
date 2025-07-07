import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

type FormDataType = {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  certifications: string;
  interests: string;
};

const initialFormData: FormDataType = {
  name: "",
  email: "",
  phone: "",
  summary: "",
  skills: "",
  experience: "",
  education: "",
  certifications: "",
  interests: "",
};

const Home: React.FC = () => {
  const [formData, setFormData] = useState<FormDataType>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    setLoading(true);
    setParsed(false);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload_resume", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error("Failed to parse resume.");
      }

      const response = await res.json();
      console.log("Full response:", response);

      const parsedData = response.data; // <--- Extract the nested data
      setFormData((prev) => ({ ...prev, ...parsedData }));
      setParsed(true);
    } catch (error) {
      console.error("Error uploading/parsing file:", error);
      alert("Failed to parse resume. Please try a different file.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/save-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to submit resume.");
      }

      alert("Resume submitted successfully!");
    } catch (error) {
      console.error("Error submitting resume:", error);
      alert("Submission failed.");
    }
  };

return (
  <>
    <header className="bg-primary text-white text-center py-4 shadow">
      <h1 className="mb-0">Smart Resume Parser</h1>
    </header>

    <section className="bg-light py-5">
      <div className="container-fluid text-center px-5">
        <h2 className="text-primary">Upload Your Resume</h2>
        <p className="lead text-muted">
          Get instant insights and auto-filled resume fields
        </p>

        <div className="row justify-content-center mt-4">
          <div className="col-12 col-md-10 col-lg-8 col-xl-6">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <input
                  type="file"
                  className="form-control mb-3"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx"
                />
                {loading && (
                  <div className="text-info fw-semibold">Parsing your resume...</div>
                )}
                {!loading && parsed && (
                  <div className="text-success fw-semibold">
                    Resume parsed successfully!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {parsed && (
      <main className="container-fluid my-5 px-5">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10 col-xl-8">
            <div className="card shadow border-0">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Review & Edit Extracted Data</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {Object.entries(formData).map(([key, value]) => (
                    <div className="mb-3" key={key}>
                      <label className="form-label text-capitalize">{key}</label>
                      <textarea
                        className="form-control"
                        rows={key === "summary" || key === "experience" ? 4 : 1}
                        name={key}
                        value={value}
                        onChange={handleChange}
                      />
                    </div>
                  ))}
                  <div className="text-end">
                    <button type="submit" className="btn btn-success px-4">
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    )}

    <footer className="bg-dark text-white text-center py-3 mt-auto">
      <p className="mb-0">&copy; 2025 Smart Resume Parser</p>
    </footer>
  </>
);

};

export default Home;
