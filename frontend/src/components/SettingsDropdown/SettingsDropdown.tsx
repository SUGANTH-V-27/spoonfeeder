import { useEffect, useRef, useState } from 'react';
import api from '../../api/api';
import './SettingsDropdown.css';
import { useHierarchy } from '../../context/HeirarchyContext.tsx';

interface SettingsDropdownProps {
    onSave?: () => void;
}

export default function SettingsDropdown({ onSave }: SettingsDropdownProps) {
    const [open, setOpen] = useState(true);
    const [collegesData, setCollegesData] = useState<any[]>([]);
    const [departmentsData, setDepartmentsData] = useState<any[]>([]);
    const [semestersData, setSemestersData] = useState<any[]>([]);
    const [selectedCollege, setSelectedCollege] = useState('_placeholder');
    const [selectedDepartment, setSelectedDepartment] = useState('_placeholder');
    const [selectedSemester, setSelectedSemester] = useState('_placeholder');

    // Loading states
    const [loadingColleges, setLoadingColleges] = useState(false);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingSemesters, setLoadingSemesters] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const collegeRef = useRef<HTMLSelectElement | null>(null);
    const { setHierarchy, setSelectedCourse, setSelectedTopic, setSelectedSubtopic} = useHierarchy();

    // Fetch colleges
    useEffect(() => {
        if (!open) return;
        setTimeout(() => collegeRef.current?.focus(), 0);

        setLoadingColleges(true);
        api.get("/colleges")
            .then(res => {
                if (Array.isArray(res.data)) setCollegesData(res.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingColleges(false));
    }, [open]);

    // Fetch departments when a college is selected
    useEffect(() => {
        if (selectedCollege === '_placeholder') {
            setDepartmentsData([]);
            return;
        }

        console.log('Selected College:', selectedCollege, 'Type:', typeof selectedCollege);

        // Find college by id - convert selectedCollege to number for comparison
        const collegeObj = collegesData.find(c => c.id === Number(selectedCollege));

        if (!collegeObj) {
            console.warn("Selected college not found:", selectedCollege);
            setDepartmentsData([]);
            return;
        }

        console.log('Found college object:', collegeObj);

        setLoadingDepartments(true);
        api.get("/departments", {
            params: { collegeId: collegeObj.id }
        })
            .then(res => {
                console.log('Departments response:', res.data);
                if (Array.isArray(res.data)) setDepartmentsData(res.data);
                else setDepartmentsData([]);
            })
            .catch(err => {
                console.error("Failed to fetch departments", err.response || err);
                setDepartmentsData([]);
            })
            .finally(() => setLoadingDepartments(false));

        setSelectedDepartment('_placeholder');
        setSelectedSemester('_placeholder');
        setSemestersData([]);
    }, [selectedCollege, collegesData]);




    // Fetch semesters when a department is selected
    useEffect(() => {
        if (selectedDepartment === '_placeholder') {
            setSemestersData([]);
            return;
        }

        const deptObj = departmentsData.find(d => d.name === selectedDepartment);
        if (!deptObj) {
            setSemestersData([]);
            return;
        }

        setLoadingSemesters(true);
        api.get(`/semesters?departmentId=${deptObj.id}`)
            .then(res => {
                if (Array.isArray(res.data)) setSemestersData(res.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingSemesters(false));

        setSelectedSemester('_placeholder');
    }, [selectedDepartment, departmentsData]);

    // Close on outside click or Escape
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
        }
        function handleEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    // Check if all selections are valid (not placeholders)
    const isFormValid = selectedCollege !== '_placeholder' &&
                       selectedDepartment !== '_placeholder' &&
                       selectedSemester !== '_placeholder';

    const handleApply = async () => {
        if (!isFormValid) return;

        // Find the objects and get their IDs
        const collegeObj = collegesData.find(c => c.id === Number(selectedCollege));
        const departmentObj = departmentsData.find(d => d.name === selectedDepartment);
        const semesterObj = semestersData.find(s => s.name === selectedSemester);

        const newHierarchy = {
            college: collegeObj?.name || selectedCollege, // Store the name for display
            department: selectedDepartment, // Already a name
            semester: selectedSemester, // Already a name
            collegeId: Number(selectedCollege), // Store the ID
            departmentId: departmentObj?.id || null, // Get the actual department ID
            semesterId: semesterObj?.id || null // Get the actual semester ID
        };

        console.log('Saving hierarchy:', newHierarchy);

        // Clear current navigation state immediately to prevent flickering
        // This will clear the sidebar and prevent showing stale data
        setSelectedCourse(null);
        setSelectedTopic(null);
        setSelectedSubtopic(null);

        // Set hierarchy - this will update localStorage and trigger course reload
        setHierarchy(newHierarchy);

        // Close the settings dropdown immediately
        setOpen(false);

        // Notify parent to close profile dropdown
        onSave?.();
    };

    return (
        <div className="settings-dropdown-container" ref={containerRef}>
            {open && (
                <div className="settings-panel" role="dialog" aria-label="Settings" aria-modal="false">
                    <form className="settings-form" onSubmit={e => { e.preventDefault(); handleApply(); }}>
                        {/* College */}
                        <div className="settings-field">
                            <label htmlFor="college-select" className="settings-label">College</label>
                            <select
                                id="college-select"
                                ref={collegeRef}
                                className="settings-select"
                                {...(selectedCollege ? { value: selectedCollege } : {})}
                                onChange={e => setSelectedCollege(e.target.value)}
                                disabled={loadingColleges}
                            >
                                <option value="_placeholder" disabled>
                                    {loadingColleges ? 'Loading colleges...' : 'Choose college'}
                                </option>
                                {Array.isArray(collegesData) && collegesData.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department */}
                        <div className="settings-field">
                            <label htmlFor="department-select" className="settings-label">Department</label>
                            <select
                                id="department-select"
                                className="settings-select"
                                value={selectedDepartment}
                                onChange={e => setSelectedDepartment(e.target.value)}
                                disabled={!departmentsData.length || loadingDepartments}
                            >
                                <option value="_placeholder" disabled>
                                    {loadingDepartments ? 'Loading departments...' :
                                     !departmentsData.length ? 'Select college first' : 'Choose department'}
                                </option>
                                {Array.isArray(departmentsData) && departmentsData.map(d => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Semester */}
                        <div className="settings-field">
                            <label htmlFor="semester-select" className="settings-label">Semester</label>
                            <select
                                id="semester-select"
                                className="settings-select"
                                value={selectedSemester}
                                onChange={e => setSelectedSemester(e.target.value)}
                                disabled={!semestersData.length || loadingSemesters}
                            >
                                <option value="_placeholder" disabled>
                                    {loadingSemesters ? 'Loading semesters...' :
                                     !semestersData.length ? 'Select department first' : 'Choose semester'}
                                </option>
                                {Array.isArray(semestersData) && semestersData.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="settings-actions">
                            <button
                                type="submit"
                                className="settings-apply"
                                disabled={!isFormValid}
                            >
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
