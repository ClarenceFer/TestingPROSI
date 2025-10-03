import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Download, User, Clock, Tag, Calendar, ArrowUpDown, X, CheckCircle, ChevronDown, FileText, BarChart2, Plus, Check, BookOpen, Trash2, AlertTriangle, Archive, RefreshCw, Trash } from 'lucide-react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = "https://sibakso-backend-production.up.railway.app/api";
const SearchPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('semua');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [viewMode, setViewMode] = useState('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [questionSets, setQuestionSets] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);

  // State untuk soft delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State untuk recycle bin
  const [showRecycleBinModal, setShowRecycleBinModal] = useState(false);
  const [recycleBinData, setRecycleBinData] = useState([]);
  const [isLoadingRecycleBin, setIsLoadingRecycleBin] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // State untuk dropdown
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showCourseTagDropdown, setShowCourseTagDropdown] = useState(false);
  const [showMaterialTagDropdown, setShowMaterialTagDropdown] = useState(false);
  const [levelSearch, setLevelSearch] = useState('');
  const [courseTagSearch, setCourseTagSearch] = useState('');
  const [materialTagSearch, setMaterialTagSearch] = useState('');
  const [selectedCourseTags, setSelectedCourseTags] = useState([]);
  const [selectedMaterialTags, setSelectedMaterialTags] = useState([]);

  // Data dropdown state
  const [difficultyLevels, setDifficultyLevels] = useState([]);
  const [courseTags, setCourseTags] = useState([]);
  const [materialTags, setMaterialTags] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownError, setDropdownError] = useState(null);

  // Helper function untuk mendapatkan nama mata kuliah berdasarkan ID
  const getSubjectNameById = (subjectId) => {
    if (!subjectId || !courseOptions.length) return subjectId;
    
    const course = courseOptions.find(course => 
      course.id.toString() === subjectId.toString()
    );
    
    return course ? course.name : subjectId;
  };

  // Helper function to get auth token
  const getAuthToken = () => {
    let token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token && currentUser?.accessToken) {
      token = currentUser.accessToken;
    }
    
    if (!token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          token = user.accessToken;
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
    }
    
    return token;
  };

  // Fungsi untuk soft delete question set
  const handleSoftDelete = async (id) => {
    setIsDeleting(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Token autentikasi tidak ditemukan. Silakan login kembali.');
        return;
      }

      console.log(`🗑️ Performing soft delete for question set ID: ${id}`);
      
      const response = await axios.patch(`${API_URL}/questionsets/${id}/soft-delete`, {}, {
        headers: { 
          "x-access-token": token,
          "Content-Type": "application/json"
        }
      });

      if (response.data.success) {
        console.log('✅ Question set soft deleted successfully');
        
        // Remove dari state lokal
        setQuestionSets(prev => prev.filter(item => item.id !== id));
        setFilteredData(prev => prev.filter(item => item.id !== id));
        
        // Tampilkan notifikasi sukses
        alert('Soal berhasil dipindahkan ke recycle bin');
        
        // Tutup modal
        setShowDeleteModal(false);
        setItemToDelete(null);
      } else {
        throw new Error(response.data.message || 'Gagal menghapus soal');
      }
    } catch (error) {
      console.error("❌ Error soft deleting question set:", error);
      
      if (error.response?.status === 401) {
        alert('Sesi telah berakhir. Silakan login kembali.');
        // Redirect ke login jika diperlukan
      } else if (error.response?.status === 403) {
        alert('Anda tidak memiliki izin untuk menghapus soal ini.');
      } else if (error.response?.status === 404) {
        alert('Soal tidak ditemukan.');
      } else {
        alert('Gagal menghapus soal. Silakan coba lagi.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Fungsi untuk mengambil data recycle bin
  const fetchRecycleBinData = async () => {
    setIsLoadingRecycleBin(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Token autentikasi tidak ditemukan. Silakan login kembali.');
        return;
      }

      console.log('🔄 Fetching recycle bin data...');
      
      const response = await axios.get(`${API_URL}/questionsets/recycle-bin`, {
        headers: { 
          "x-access-token": token,
          "Content-Type": "application/json"
        }
      });

      if (response.data.success) {
        // Transform data sama seperti question sets biasa
        const transformedData = response.data.data.map(item => {
          let subjectName = item.subject;
          
          if (item.courseName || item.subjectName) {
            subjectName = item.courseName || item.subjectName;
          } else if (courseOptions.length > 0) {
            const course = courseOptions.find(course => 
              course.id.toString() === item.subject.toString()
            );
            subjectName = course ? course.name : item.subject;
          }
          
          return {
            id: item.id,
            fileName: item.title,
            subject: subjectName,
            subjectId: item.subject,
            year: item.year,
            lecturer: item.lecturer || (item.creator ? (item.creator.fullName || item.creator.username) : 'Unknown'),
            level: item.level,
            lastUpdated: new Date(item.lastupdated || item.updated_at).toISOString(),
            deletedAt: new Date(item.deleted_at).toISOString(),
            deletedBy: item.deletedBy || null,
            topics: item.topics ? item.topics.split(',').map(topic => topic.trim()) : [],
            downloads: item.downloads || 0,
            description: item.description || '',
            hasAnswerKey: Array.isArray(item.files) && item.files.some(file => 
              file.filecategory === 'kunci' || file.filecategory === 'answers'
            ),
            hasTestCase: Array.isArray(item.files) && item.files.some(file => 
              file.filecategory === 'test' || file.filecategory === 'testCases'
            )
          };
        });
        
        setRecycleBinData(transformedData);
        console.log(`✅ Loaded ${transformedData.length} deleted question sets`);
      } else {
        throw new Error(response.data.message || 'Failed to fetch recycle bin data');
      }
    } catch (error) {
      console.error("❌ Error fetching recycle bin data:", error);
      
      if (error.response?.status === 401) {
        alert('Sesi telah berakhir. Silakan login kembali.');
      } else if (error.response?.status === 403) {
        alert('Anda tidak memiliki izin untuk mengakses recycle bin.');
      } else {
        alert('Gagal memuat data recycle bin. Silakan coba lagi.');
      }
    } finally {
      setIsLoadingRecycleBin(false);
    }
  };

  // Fungsi untuk restore dari recycle bin
  const handleRestore = async (id) => {
    setIsRestoring(true);
    try {
      const token = getAuthToken();
      if (!token) {
        alert('Token autentikasi tidak ditemukan. Silakan login kembali.');
        return;
      }

      console.log(`♻️ Restoring question set ID: ${id}`);
      
      const response = await axios.patch(`${API_URL}/questionsets/${id}/restore`, {}, {
        headers: { 
          "x-access-token": token,
          "Content-Type": "application/json"
        }
      });

      if (response.data.success) {
        console.log('✅ Question set restored successfully');
        
        // Remove dari recycle bin data
        setRecycleBinData(prev => prev.filter(item => item.id !== id));
        
        // Refresh question sets list
        const courses = await fetchCourseOptions();
        await fetchQuestionSets(courses);
        
        alert('Soal berhasil dipulihkan dari recycle bin');
      } else {
        throw new Error(response.data.message || 'Gagal memulihkan soal');
      }
    } catch (error) {
      console.error("❌ Error restoring question set:", error);
      
      if (error.response?.status === 401) {
        alert('Sesi telah berakhir. Silakan login kembali.');
      } else if (error.response?.status === 403) {
        alert('Anda tidak memiliki izin untuk memulihkan soal ini.');
      } else if (error.response?.status === 404) {
        alert('Soal tidak ditemukan di recycle bin.');
      } else {
        alert('Gagal memulihkan soal. Silakan coba lagi.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  // Fungsi untuk permanent delete
  const handlePermanentDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini secara permanen? Aksi ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        alert('Token autentikasi tidak ditemukan. Silakan login kembali.');
        return;
      }

      console.log(`🗑️ Permanently deleting question set ID: ${id}`);
      
      const response = await axios.delete(`${API_URL}/questionsets/${id}/permanent`, {
        headers: { 
          "x-access-token": token,
          "Content-Type": "application/json"
        }
      });

      if (response.data.success) {
        console.log('✅ Question set permanently deleted');
        
        // Remove dari recycle bin data
        setRecycleBinData(prev => prev.filter(item => item.id !== id));
        
        alert('Soal berhasil dihapus secara permanen');
      } else {
        throw new Error(response.data.message || 'Gagal menghapus soal secara permanen');
      }
    } catch (error) {
      console.error("❌ Error permanently deleting question set:", error);
      alert('Gagal menghapus soal secara permanen. Silakan coba lagi.');
    }
  };

  // Fungsi untuk membuka recycle bin modal
  const openRecycleBinModal = () => {
    setShowRecycleBinModal(true);
    fetchRecycleBinData();
  };

  // Fungsi untuk konfirmasi delete
  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  // Fungsi untuk mengambil data course options
  const fetchCourseOptions = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn("No auth token found for fetching courses");
        return;
      }
      
      console.log('🔄 Fetching course options...');
      
      const response = await axios.get(`${API_URL}/course-material-stats`, {
        headers: { 
          "x-access-token": token,
          "Content-Type": "application/json"
        }
      });

      if (response.data && Array.isArray(response.data)) {
        const courses = response.data.map(course => ({
          id: course.id,
          name: course.name
        }));
        
        setCourseOptions(courses);
        console.log(`✅ Loaded ${courses.length} course options`);
        return courses;
      } else {
        console.warn("Invalid course data format received");
        return [];
      }
    } catch (error) {
      console.error("❌ Error fetching course options:", error);
      return [];
    }
  };

  // Fungsi untuk mengambil data dropdown
  const fetchDropdownData = async () => {
    setDropdownLoading(true);
    setDropdownError(null);
    
    try {
      console.log('🔄 Fetching dropdown data...');
      const response = await axios.get(`${API_URL}/dropdown/all-dropdown-data`);
      
      if (response.data.success) {
        const { courseTags: courseTagsData, materialTags: materialTagsData, difficultyLevels: difficultyData } = response.data.data;
        
        setCourseTags(courseTagsData.map(tag => tag.name));
        setMaterialTags(materialTagsData.map(tag => tag.name));
        setDifficultyLevels(difficultyData.map(level => level.level));
        
        console.log('✅ Dropdown data loaded successfully:', {
          courseTags: courseTagsData.length,
          materialTags: materialTagsData.length,
          difficultyLevels: difficultyData.length
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch dropdown data');
      }
      
    } catch (error) {
      console.error("❌ Error fetching dropdown data:", error);
      setDropdownError(error.message);
      
      // Fallback ke data default jika API gagal
      console.log('🔄 Using fallback data for dropdowns');
      setDifficultyLevels(['Mudah', 'Sedang', 'Sulit']);
      setCourseTags([
        'Algoritma dan Pemrograman',
        'Struktur Data', 
        'Basis Data',
        'Pemrograman Web',
        'Pemrograman Mobile',
        'Jaringan Komputer',
        'Sistem Operasi',
        'Rekayasa Perangkat Lunak'
      ]);
      setMaterialTags([
        'Array', 'Linked List', 'Stack', 'Queue', 'Tree', 
        'Graph', 'Sorting', 'Searching', 'SQL', 'NoSQL',
        'HTML', 'CSS', 'JavaScript', 'React', 'Node.js',
        'PHP', 'Python', 'Java'
      ]);
    } finally {
      setDropdownLoading(false);
    }
  };

  // Fungsi untuk mendownload file
  const handleDownload = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/questionsets/${id}?download=true`);
      
      const questionFile = response.data.files.find(file => 
        file.filecategory === 'soal' || file.filecategory === 'questions'
      );
      
      if (questionFile) {
        window.open(`${API_URL}/files/download/${questionFile.id}`, '_blank');
      } else {
        alert('File soal tidak ditemukan');
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      alert('Gagal mendownload file');
    }
  };
  
  // Fungsi untuk navigasi ke halaman preview
  const handleCardClick = (id) => {
    navigate(`/preview/${id}`);
  };

  // Filter function
  const filterData = () => {
    setIsLoading(true);
    
    let filtered = [...questionSets];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const subjectName = getSubjectNameById(item.subject).toLowerCase();
        return (
          item.fileName.toLowerCase().includes(query) ||
          subjectName.includes(query) ||
          item.lecturer.toLowerCase().includes(query) ||
          (item.topics && item.topics.some(topic => topic.toLowerCase().includes(query)))
        );
      });
    }
    
    if (selectedLevel.length > 0) {
      filtered = filtered.filter(item => selectedLevel.includes(item.level));
    }
    
    if (selectedCourseTags.length > 0) {
      filtered = filtered.filter(item => {
        const subjectName = getSubjectNameById(item.subject).toLowerCase();
        return selectedCourseTags.some(tag => subjectName.includes(tag.toLowerCase()));
      });
    }
    
    if (selectedMaterialTags.length > 0) {
      filtered = filtered.filter(item => {
        return selectedMaterialTags.some(tag =>
          item.topics.some(topic => topic.toLowerCase().includes(tag.toLowerCase()))
        );
      });
    }
    
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.lastUpdated);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    setFilteredData(filtered);
    setIsLoading(false);
    return filtered;
  };

  // Filter dropdown data berdasarkan input pencarian
  const filteredLevels = difficultyLevels.filter(level =>
    level.toLowerCase().includes(levelSearch.toLowerCase())
  );

  const filteredCourseTags = courseTags.filter(tag =>
    tag.toLowerCase().includes(courseTagSearch.toLowerCase())
  );

  const filteredMaterialTags = materialTags.filter(tag =>
    tag.toLowerCase().includes(materialTagSearch.toLowerCase())
  );

  // Fungsi untuk menambah/menghapus level
  const toggleLevel = (level) => {
    if (selectedLevel.includes(level)) {
      setSelectedLevel(prev => prev.filter(l => l !== level));
    } else {
      setSelectedLevel(prev => [...prev, level]);
    }
  }

  // Fungsi untuk menambah/menghapus course tag
  const toggleCourseTag = (tag) => {
    if (selectedCourseTags.includes(tag)) {
      setSelectedCourseTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedCourseTags(prev => [...prev, tag]);
    }
  }

  // Fungsi untuk menambah/menghapus material tag
  const toggleMaterialTag = (tag) => {
    if (selectedMaterialTags.includes(tag)) {
      setSelectedMaterialTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedMaterialTags(prev => [...prev, tag]);
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Helper function to get level color
  const getLevelColor = (level) => {
    switch(level) {
      case 'Mudah':
        return 'bg-green-100 text-green-700';
      case 'Sedang':
        return 'bg-yellow-100 text-yellow-700';
      case 'Sulit':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Fungsi untuk mengambil data dari API dengan konversi subject ID ke nama
  const fetchQuestionSets = async (courses = []) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/questionsets`);
      
      console.log('🔄 Processing question sets data...');
      
      const transformedData = response.data.map(item => {
        let subjectName = item.subject;
        
        if (item.courseName || item.subjectName) {
          subjectName = item.courseName || item.subjectName;
        } else if (courses.length > 0) {
          const course = courses.find(course => 
            course.id.toString() === item.subject.toString()
          );
          subjectName = course ? course.name : item.subject;
        }
        
        return {
          id: item.id,
          fileName: item.title,
          subject: subjectName,
          subjectId: item.subject,
          year: item.year,
          lecturer: item.lecturer || (item.creator ? (item.creator.fullName || item.creator.username) : 'Unknown'),
          level: item.level,
          lastUpdated: new Date(item.lastupdated || item.updated_at).toISOString(),
          topics: item.topics ? item.topics.split(',').map(topic => topic.trim()) : [],
          downloads: item.downloads || 0,
          description: item.description || '',
          hasAnswerKey: Array.isArray(item.files) && item.files.some(file => 
            file.filecategory === 'kunci' || file.filecategory === 'answers'
          ),
          hasTestCase: Array.isArray(item.files) && item.files.some(file => 
            file.filecategory === 'test' || file.filecategory === 'testCases'
          )
        };
      });
      
      console.log(`✅ Processed ${transformedData.length} question sets with subject names`);
      
      setQuestionSets(transformedData);
      setFilteredData(transformedData);
    } catch (error) {
      console.error("❌ Error fetching question sets:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update useEffect untuk mengambil course options terlebih dahulu
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('🔄 Initializing SearchPage data...');
        
        const courses = await fetchCourseOptions();
        
        await Promise.all([
          fetchDropdownData(),
          fetchQuestionSets(courses)
        ]);
        
        console.log('✅ SearchPage data initialization complete');
      } catch (error) {
        console.error('❌ Error initializing data:', error);
      }
    };
    
    initializeData();
  }, []);

  // Auto-filter saat ada perubahan
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (questionSets.length > 0 && !dropdownLoading && courseOptions.length > 0) {
        filterData();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedLevel, selectedCourseTags, selectedMaterialTags, dateRange, questionSets, dropdownLoading, courseOptions]);

  const renderCard = (item) => {
    const hasAnswerKey = item.hasAnswerKey ?? false;
    const hasTestCase = item.hasTestCase ?? false;

    const completeness = (hasAnswerKey ? 1 : 0) + (hasTestCase ? 1 : 0);
    const completenessPercent = (completeness / 2) * 100;

    let completenessLabel = "Belum Lengkap";
    let barColor = "bg-red-400";
    if (completeness === 1) {
      completenessLabel = hasAnswerKey ? "Ada Kunci Jawaban" : "Ada Test Case";
      barColor = "bg-yellow-400";
    } else if (completeness === 2) {
      completenessLabel = "Lengkap";
      barColor = "bg-green-500";
    }

    return (
      <motion.div
        variants={itemVariants}
        className={`bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer ${viewMode === 'grid' ? 'h-full' : ''}`}
        onClick={() => handleCardClick(item.id)}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{item.fileName}</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(item.level)}`}>
                {item.level}
              </span>
              {/* Tombol Delete */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete(item);
                }}
                title="Hapus ke Recycle Bin"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Indikator Kelengkapan Soal */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Kelengkapan Soal</span>
              <span className={`text-xs font-semibold ${
                completeness === 2 ? 'text-green-600' :
                completeness === 1 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {completenessLabel}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-2 ${barColor} transition-all`}
                style={{ width: `${completenessPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] flex items-center gap-1 ${hasAnswerKey ? 'text-green-600' : 'text-gray-400'}`}>
                <Check className="w-3 h-3" /> Kunci Jawaban
              </span>
              <span className={`text-[10px] flex items-center gap-1 ${hasTestCase ? 'text-green-600' : 'text-gray-400'}`}>
                <Check className="w-3 h-3" /> Test Case
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <BookOpen className="w-4 h-4 mr-2" />
              <span title={`Subject ID: ${item.subjectId}`}>{item.subject}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span>{item.lecturer}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{formatDate(item.lastUpdated)}</span>
            </div>
          </div>

          {item.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {item.topics.map((topic, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center text-sm text-gray-500">
              <Download className="w-4 h-4 mr-1" />
              <span>{item.downloads} unduhan</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(item.id);
              }}
            >
              Unduh
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Loading animation dengan informasi yang lebih spesifik
  const LoadingAnimation = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
      />
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity
        }}
        className="ml-4 text-lg font-medium text-blue-600"
      >
        {dropdownLoading && courseOptions.length === 0 ? 'Memuat Data Mata Kuliah...' :
         dropdownLoading ? 'Memuat Filter Data...' : 
         'Memuat Data...'}
      </motion.p>
    </div>
  );

  // Indikator jika menggunakan data fallback
  const DropdownStatusIndicator = () => {
    if (dropdownError && !dropdownLoading) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-lg mb-4 text-sm max-w-6xl mx-auto"
        >
          ⚠️ Menggunakan data filter default. Server mungkin sedang bermasalah. ({dropdownError})
        </motion.div>
      );
    }
    return null;
  };

  // Dropdown animation variants
  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, height: 0 },
    visible: { opacity: 1, y: 0, height: 'auto' }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header currentUser={currentUser} />

      {/* Status indicator */}
      <DropdownStatusIndicator />

      {isLoading || dropdownLoading || courseOptions.length === 0 ? (
        <LoadingAnimation />
      ) : (
        <div className="w-full px-4 md:px-8 py-8 md:py-12">
          {/* Header Section with Animated Background */}
          <div className="relative overflow-hidden">
            <motion.div
              className="absolute inset-0 -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-blue-200 opacity-30"
                  style={{
                    width: Math.random() * 120 + 40,
                    height: Math.random() * 120 + 40,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    x: [0, Math.random() * 50 - 25],
                    y: [0, Math.random() * 50 - 25],
                  }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: Math.random() * 8 + 8,
                  }}
                />
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center relative z-10 py-12"
            >
              <motion.h1
                className="text-4xl md:text-5xl font-bold mb-3 text-gray-900"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Bank Soal <span className="text-blue-600">Informatika</span>
              </motion.h1>
              <motion.p
                className="text-lg text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Temukan dan Unduh Soal untuk Kebutuhan Akademik Anda
              </motion.p>
            </motion.div>
          </div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-6xl mx-auto bg-white rounded-2xl p-6 shadow-lg mb-8 border border-gray-100"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari soal berdasarkan mata kuliah, dosen, atau topik..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                onClick={() => filterData()}
              >
                <Search className="w-5 h-5" />
                Cari
              </motion.button>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Tingkat Kesulitan Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-gray-700">Pilih Tingkat Kesulitan</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari Tingkat Kesulitan"
                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={levelSearch}
                    onChange={(e) => setLevelSearch(e.target.value)}
                    onClick={() => setShowLevelDropdown(true)}
                  />
                  <button
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showLevelDropdown && (
                    <motion.div
                      className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      {filteredLevels.length > 0 ? (
                        filteredLevels.map((level) => (
                          <div
                            key={level}
                            className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              toggleLevel(level);
                            }}
                          >
                            <div className={`w-5 h-5 border rounded mr-2 flex items-center justify-center ${selectedLevel.includes(level) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {selectedLevel.includes(level) && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span>{level}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500">Tidak ada hasil</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tag Mata Kuliah Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-gray-700">Pilih Tag Mata Kuliah</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari Tag Mata Kuliah"
                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={courseTagSearch}
                    onChange={(e) => setCourseTagSearch(e.target.value)}
                    onClick={() => setShowCourseTagDropdown(true)}
                  />
                  <button
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowCourseTagDropdown(!showCourseTagDropdown)}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showCourseTagDropdown && (
                    <motion.div
                      className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      {filteredCourseTags.length > 0 ? (
                        filteredCourseTags.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              toggleCourseTag(tag);
                            }}
                          >
                            <div className={`w-5 h-5 border rounded mr-2 flex items-center justify-center ${selectedCourseTags.includes(tag) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {selectedCourseTags.includes(tag) && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span>{tag}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500">Tidak ada hasil</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tag Materi Dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-gray-700">Pilih Tag Materi</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari Tag Materi"
                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={materialTagSearch}
                    onChange={(e) => setMaterialTagSearch(e.target.value)}
                    onClick={() => setShowMaterialTagDropdown(true)}
                  />
                  <button
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowMaterialTagDropdown(!showMaterialTagDropdown)}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showMaterialTagDropdown && (
                    <motion.div
                      className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      {filteredMaterialTags.length > 0 ? (
                        filteredMaterialTags.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              toggleMaterialTag(tag);
                            }}
                          >
                            <div className={`w-5 h-5 border rounded mr-2 flex items-center justify-center ${selectedMaterialTags.includes(tag) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {selectedMaterialTags.includes(tag) && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span>{tag}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500">Tidak ada hasil</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Applied Filters Display */}
            {(selectedLevel.length > 0 || selectedCourseTags.length > 0 || selectedMaterialTags.length > 0 || dateRange.start || dateRange.end) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 flex flex-wrap gap-2"
              >
                <span className="text-sm text-gray-500 my-auto">Filter Aktif:</span>

                {selectedLevel.map(level => (
                  <motion.span
                    key={level}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {level}
                    <button onClick={() => toggleLevel(level)}>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  </motion.span>
                ))}

                {selectedCourseTags.map(tag => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {tag}
                    <button onClick={() => toggleCourseTag(tag)}>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  </motion.span>
                ))}

                {selectedMaterialTags.map(tag => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {tag}
                    <button onClick={() => toggleMaterialTag(tag)}>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  </motion.span>
                ))}

                {(dateRange.start || dateRange.end) && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    {dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'Awal'} -
                    {dateRange.end ? new Date(dateRange.end).toLocaleDateString() : 'Akhir'}
                    <button onClick={() => setDateRange({ start: '', end: '' })}>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  </motion.span>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 text-red-600 text-sm flex items-center gap-1 hover:bg-red-50 rounded-full"
                  onClick={() => {
                    setSelectedLevel([]);
                    setSelectedCourseTags([]);
                    setSelectedMaterialTags([]);
                    setDateRange({ start: '', end: '' });
                  }}
                >
                  <X className="w-3 h-3" />
                  Hapus Semua
                </motion.button>
              </motion.div>
            )}

            {/* View Toggle and Results Count */}
            <div className="flex justify-between items-center mt-6">
              <p className="text-gray-600 text-sm">
                Menampilkan <span className="font-medium">{filteredData.length}</span> hasil pencarian
              </p>
              <div className="flex gap-2">
                {/* Recycle Bin Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  onClick={openRecycleBinModal}
                  title="Recycle Bin"
                >
                  <Archive className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <BarChart2 className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setViewMode('table')}
                >
                  <FileText className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Results Section */}
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key="grid-view"
              >
                {filteredData.map((item, index) => (
                  renderCard(item)
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="overflow-x-auto max-w-7xl mx-auto bg-white rounded-xl shadow-lg"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key="table-view"
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                          Nama File <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                          Mata Kuliah <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                          Tingkat Kesulitan <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                          Dosen <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                          Tanggal <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((item) => (
                      <motion.tr
                        key={item.id}
                        variants={itemVariants}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.fileName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" title={`Subject ID: ${item.subjectId}`}>
                          {item.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs ${item.level === 'Mudah' ? 'bg-green-100 text-green-700' :
                            item.level === 'Sedang' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                            {item.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {item.lecturer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDate(item.lastUpdated)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="inline-flex items-center px-3 py-1 rounded-lg text-sm text-white bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleDownload(item.id)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="inline-flex items-center px-3 py-1 rounded-lg text-sm text-white bg-red-600 hover:bg-red-700"
                              onClick={() => confirmDelete(item)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Hapus
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>

          <Link to="/upload">
            <motion.button
              className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg z-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="text-white w-8 h-8" />
            </motion.button>
          </Link>

          {/* No Results Message */}
          {filteredData.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-lg text-gray-600">Tidak ada hasil yang ditemukan. Silakan coba pencarian lain.</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Recycle Bin Modal */}
      <AnimatePresence>
        {showRecycleBinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRecycleBinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <Archive className="w-6 h-6 text-gray-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Recycle Bin</h3>
                    <p className="text-sm text-gray-500">
                      {recycleBinData.length} soal dihapus
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRecycleBinModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {isLoadingRecycleBin ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
                    />
                    <p className="ml-3 text-gray-600">Memuat data recycle bin...</p>
                  </div>
                ) : recycleBinData.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Recycle Bin Kosong</h4>
                    <p className="text-gray-500">Tidak ada soal yang dihapus</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recycleBinData.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                {item.fileName}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(item.level)}`}>
                                {item.level}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  <span>{item.subject}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <User className="w-4 h-4 mr-2" />
                                  <span>{item.lecturer}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  <span>Dihapus: {formatDate(item.deletedAt)}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="w-4 h-4 mr-2" />
                                  <span>Dibuat: {formatDate(item.lastUpdated)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Topics */}
                            {item.topics?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {item.topics.map((topic, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Completeness Indicator */}
                            <div className="mb-4">
                              <div className="flex items-center gap-4">
                                <span className={`text-xs flex items-center gap-1 ${item.hasAnswerKey ? 'text-green-600' : 'text-gray-400'}`}>
                                  <Check className="w-3 h-3" /> Kunci Jawaban
                                </span>
                                <span className={`text-xs flex items-center gap-1 ${item.hasTestCase ? 'text-green-600' : 'text-gray-400'}`}>
                                  <Check className="w-3 h-3" /> Test Case
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 ml-4">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleRestore(item.id)}
                              disabled={isRestoring}
                            >
                              {isRestoring ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                                />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Pulihkan
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                              onClick={() => handlePermanentDelete(item.id)}
                            >
                              <Trash className="w-3 h-3" />
                              Hapus Permanen
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {recycleBinData.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    💡 Tips: Soal yang dihapus akan disimpan selama 30 hari
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => fetchRecycleBinData()}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h3>
                  <p className="text-sm text-gray-500">Aksi ini akan memindahkan soal ke recycle bin</p>
                </div>
              </div>

              {itemToDelete && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Anda akan menghapus:</p>
                  <p className="font-medium text-gray-900">{itemToDelete.fileName}</p>
                  <p className="text-sm text-gray-500">Mata Kuliah: {itemToDelete.subject}</p>
                  <p className="text-sm text-gray-500">Dosen: {itemToDelete.lecturer}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  disabled={isDeleting}
                >
                  Batal
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleSoftDelete(itemToDelete.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Hapus ke Recycle Bin
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Filter Pencarian</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tingkat Kesulitan
                  </label>
                  <div className="space-y-2">
                    {difficultyLevels.map((level) => (
                      <label key={level} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={selectedLevel.includes(level)}
                          onChange={() => {
                            if (selectedLevel.includes(level)) {
                              setSelectedLevel(prev => prev.filter(l => l !== level));
                            } else {
                              setSelectedLevel(prev => [...prev, level]);
                            }
                          }}
                        />
                        <span className="text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rentang Tanggal
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dari</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sampai</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    onClick={() => {
                      setSelectedLevel([]);
                      setDateRange({ start: '', end: '' });
                    }}
                  >
                    Reset
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    onClick={() => setShowFilterModal(false)}
                  >
                    Terapkan Filter
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Buttons for Sorting and Views (Mobile Friendly) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 md:hidden"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white"
          onClick={() => setShowFilterModal(true)}
        >
          <Filter className="w-5 h-5" />
        </motion.button>
      </motion.div>
      <Footer />
    </div>
  );
};

export default SearchPage;