import { useState, useEffect, useRef } from 'react';
import './collegeDepartment.css';
import { getColleges } from '../../api/colleges';
import { getDepartments } from '../../api/department';
import { getSemestersByIds } from '../../api/semester';

interface CollegeDepartmentProps {
  onNavigateToContent: () => void;
}

interface HierarchyData {
  college: string;
  department: string;
  semester: string;
  collegeId: number | null;
  departmentId: number | null;
  semesterId: number | null;
}

type Step = 'college' | 'department' | 'semester';

const CollegeDepartment = ({ onNavigateToContent }: CollegeDepartmentProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('college');
  const [hierarchy, setHierarchy] = useState<HierarchyData>({
    college: '',
    department: '',
    semester: '',
    collegeId: null,
    departmentId: null,
    semesterId: null,
  });

  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [error, setError] = useState<string>('');
  const collegeReqId = useRef(0);

  // Use refs to track request IDs to prevent race conditions
  const semesterRequestIdRef = useRef<number>(0);
  const departmentRequestIdRef = useRef<number>(0);

  // Load colleges on component mount
  useEffect(() => {
    loadColleges();
  }, []);

  // Load departments when college is selected
  useEffect(() => {
    if (hierarchy.college) {
      loadDepartments();
    } else {
      setDepartments([]); // Clear departments if college is cleared
    }
  }, [hierarchy.college]);

  // Load semesters when department is selected (depends on both department AND college)
  useEffect(() => {
    if (hierarchy.department && hierarchy.college) {
      loadSemesters();
    } else {
      setSemesters([]); // Clear semesters if department or college is missing
      setLoadingSemesters(false);
    }
  }, [hierarchy.department, hierarchy.college]);

  const loadColleges = async () => {
    const reqId = ++collegeReqId.current;
    try {
      setLoadingColleges(true);
      setError(''); // Clear previous errors
      const response = await getColleges();
      if (reqId !== collegeReqId.current) return; // stale response
      setColleges(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (reqId !== collegeReqId.current) return;
      console.error('Failed to load colleges:', err);

      // Check for authentication errors
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      // For other errors, provide more specific messaging
      if (err.response?.status >= 500) {
        setError('Server error occurred. Please try again later.');
      } else {
        setError('Failed to load colleges. Please check your internet connection and try again.');
      }

      setColleges([]);
    } finally {
      setLoadingColleges(false);
    }
  };

  const loadDepartments = async () => {
    // Increment request ID to invalidate previous requests
    departmentRequestIdRef.current += 1;
    const currentRequestId = departmentRequestIdRef.current;

    try {
      setLoadingDepartments(true);
      setError(''); // Clear previous errors
      const response = await getDepartments(hierarchy.collegeId!);
      
      // Check if this is still the latest request
      if (departmentRequestIdRef.current !== currentRequestId) {
        return;
      }

      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      // Don't update state if this is not the latest request
      if (departmentRequestIdRef.current !== currentRequestId) {
        return;
      }
      console.error('Failed to load departments:', err);

      // Check for authentication errors
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      // For other errors, provide more specific messaging
      if (err.response?.status === 404) {
        setError('No departments found for the selected college. This might be a data issue.');
      } else if (err.response?.status >= 500) {
        setError('Server error occurred. Please try again later.');
      } else {
        setError('Failed to load departments. Please check your internet connection and try again.');
      }

      setDepartments([]);
    } finally {
      // Only update loading state if this is still the latest request
      if (departmentRequestIdRef.current === currentRequestId) {
        setLoadingDepartments(false);
      }
    }
  };

  const loadSemesters = async () => {
    // Increment request ID to invalidate previous requests
    semesterRequestIdRef.current += 1;
    const currentRequestId = semesterRequestIdRef.current;

    // Store current values to verify they haven't changed when response arrives
    const currentDepartment = hierarchy.department;
    const currentCollege = hierarchy.college;

    try {
      setLoadingSemesters(true);
      setError(''); // Clear previous errors
      const response = await getSemestersByIds(hierarchy.departmentId!, hierarchy.collegeId!);
      
      // Check if this is still the latest request
      if (semesterRequestIdRef.current !== currentRequestId) {
        return;
      }

      // Verify the hierarchy hasn't changed while the request was in flight
      if (hierarchy.department !== currentDepartment || hierarchy.college !== currentCollege) {
        return;
      }

      const semesterData = Array.isArray(response.data) ? response.data : [];
      setSemesters(semesterData);
    } catch (err: any) {
      // Don't update state if this is not the latest request
      if (semesterRequestIdRef.current !== currentRequestId) {
        return;
      }
      console.error('Failed to load semesters:', err);

      // Check for authentication errors (should be handled by interceptor, but provide fallback)
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        // The API interceptor should handle the redirect, but let's also clear local state
        setTimeout(() => window.location.href = '/', 2000);
        return;
      }

      // For other errors, provide more specific messaging
      if (err.response?.status === 404) {
        setError('No semesters found for the selected department and college. This might be a data issue.');
      } else if (err.response?.status >= 500) {
        setError('Server error occurred. Please try again later.');
      } else {
        setError('Failed to load semesters. Please check your internet connection and try again.');
      }

      setSemesters([]); // Clear semesters on error
    } finally {
      // Only update loading state if this is still the latest request
      if (semesterRequestIdRef.current === currentRequestId) {
        setLoadingSemesters(false);
      }
    }
  };

  const handleSelection = (field: keyof HierarchyData, value: string, id?: number) => {
    setError('');
    const newHierarchy = {
      ...hierarchy,
      [field]: value,
      // Set the corresponding ID field
      ...(field === 'college' && id !== undefined && { collegeId: id, department: '', departmentId: null, semester: '', semesterId: null }),
      ...(field === 'department' && id !== undefined && { departmentId: id, semester: '', semesterId: null }),
      ...(field === 'semester' && id !== undefined && { semesterId: id }),
    };
    setHierarchy(newHierarchy);

    // Move to next step
    if (field === 'college') {
      setCurrentStep('department');
    } else if (field === 'department') {
      setCurrentStep('semester');
    } else if (field === 'semester') {
      // Validate that the selected semester exists in our fetched data
      const semesterExists = semesters.some(semester =>
        semester.name.toLowerCase() === value.toLowerCase()
      );

      if (!semesterExists) {
        setError(`Selected semester "${value}" is not available. Please try refreshing or contact support.`);
        return;
      }

      handleComplete(newHierarchy);
    }
  };

  const handleBack = () => {
    if (currentStep === 'department') {
      setCurrentStep('college');
      setHierarchy(prev => ({ ...prev, department: '', departmentId: null, semester: '', semesterId: null }));
    } else if (currentStep === 'semester') {
      setCurrentStep('department');
      setHierarchy(prev => ({ ...prev, semester: '', semesterId: null }));
    }
  };

  const handleComplete = (completedHierarchy?: HierarchyData) => {
    const hierarchyToStore = completedHierarchy || hierarchy;
    // Store the hierarchy details in localStorage
    localStorage.setItem('hierarchy', JSON.stringify(hierarchyToStore));

    // Navigate to content
    onNavigateToContent();
  };

  const renderCollegeStep = () => (
    <div className="step-content">
      <div className="step-header">
        <h2>Select Your College</h2>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button
            className="retry-btn"
            onClick={() => {
              setError('');
              if (currentStep === 'college') loadColleges();
              else if (currentStep === 'department') loadDepartments();
              else if (currentStep === 'semester') loadSemesters();
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="selection-grid">
        {loadingColleges ? (
          <div className="loading">Loading colleges...</div>
        ) : Array.isArray(colleges) && colleges.length > 0 ? (
          colleges.map((college) => (
            <button
              key={college.id}
              className="selection-card"
              onClick={() => handleSelection('college', college.name, college.id)}
            >
              <h3>{college.name}</h3>
            </button>
          ))
        ) : (
          <div className="no-data">
            <p>No colleges available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDepartmentStep = () => (
    <div className="step-content">

      <div className="step-header">
        <div className="step-nav">

        </div>
        <h2>Select Your Department</h2>
        <p>Choose your department in {hierarchy.college}</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button
            className="retry-btn"
            onClick={() => {
              setError('');
              if (currentStep === 'college') loadColleges();
              else if (currentStep === 'department') loadDepartments();
              else if (currentStep === 'semester') loadSemesters();
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="selection-grid">
        {loadingDepartments ? (
          <div className="loading">Loading departments...</div>
        ) : Array.isArray(departments) && departments.length > 0 ? (
          departments.map((department) => (
            <button
              key={department.id}
              className="selection-card"
              onClick={() => handleSelection('department', department.name, department.id)}
            >
              <h3>{department.name}</h3>
            </button>
          ))
        ) : (
          <div className="no-data">
            <p>No departments available for {hierarchy.college}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSemesterStep = () => (
    <div className="step-content">
      <div className="step-header">
        <div className="step-nav">
        </div>
        <h2>Select Your Semester</h2>
        <p>Choose your current semester in {hierarchy.department}</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button
            className="retry-btn"
            onClick={() => {
              setError('');
              if (currentStep === 'college') loadColleges();
              else if (currentStep === 'department') loadDepartments();
              else if (currentStep === 'semester') loadSemesters();
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="selection-grid">
        {loadingSemesters ? (
          <div className="loading">Loading semesters...</div>
        ) : Array.isArray(semesters) && semesters.length > 0 ? (
          semesters.map((semester) => (
            <button
              key={semester.id}
              className="selection-card"
              onClick={() => handleSelection('semester', semester.name, semester.id)}
            >
              <h3>{semester.name}</h3>
            </button>
          ))
        ) : (
          <div className="no-data">
            <p>No semesters found for {hierarchy.department}</p>
            <p>Available semesters in database may not match the department name.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="college-department-container">
      {currentStep !== 'college' && (
          <button className="back-button" onClick={handleBack} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
      )}
      <div className="college-department-card">
        <div className="step-indicator">
          <div className={`step-dot ${currentStep === 'college' || currentStep === 'department' || currentStep === 'semester' ? 'active' : ''}`}>1</div>
          <div className={`step-line ${currentStep === 'department' || currentStep === 'semester' ? 'active' : ''}`}></div>
          <div className={`step-dot ${currentStep === 'department' || currentStep === 'semester' ? 'active' : ''}`}>2</div>
          <div className={`step-line ${currentStep === 'semester' ? 'active' : ''}`}></div>
          <div className={`step-dot ${currentStep === 'semester' ? 'active' : ''}`}>3</div>
        </div>

        <div className="step-labels">
          <span className={currentStep === 'college' ? 'active' : ''}>College</span>
          <span className={currentStep === 'department' ? 'active' : ''}>Department</span>
          <span className={currentStep === 'semester' ? 'active' : ''}>Semester</span>
        </div>

        {currentStep === 'college' && renderCollegeStep()}
        {currentStep === 'department' && renderDepartmentStep()}
        {currentStep === 'semester' && renderSemesterStep()}
      </div>
    </div>
  );
};

export default CollegeDepartment;
