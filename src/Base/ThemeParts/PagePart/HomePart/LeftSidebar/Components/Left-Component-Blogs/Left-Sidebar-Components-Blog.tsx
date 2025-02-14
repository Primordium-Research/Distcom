"use client"
import { faCalendarDays, faEye, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_URL } from '../../../../../../Api/Api';
import { isValidComponentBlogs } from '../../../../../../Api/Sec-3/Checkers/ComponentsChecker';

export interface ComponentBlogsinterface {
  Bid: string;
  Bname: string;
  Bauthor: string;
  BauthorImage: string;
  Bcategory: string;
  Bcontent: string;
  Bdate: string;
  Bimage: string;
  Btags: string;
  Burl: string;
  Bviews: number;
}

export default function LeftSidebarComponentsBlogs() {
  const [blogs, setBlogs] = useState<ComponentBlogsinterface[]>([]);
  const router = useRouter();

  useEffect(() => {
    const apiUrl = `${API_URL}/GetBlogs`;
    axios.get<ComponentBlogsinterface[]>(apiUrl)
      .then((response) => {
        if (!response.data || !Array.isArray(response.data) || response.data.some(blog => !isValidComponentBlogs(blog))) {
          console.error('API response is not an array or contains invalid data');
          return;
        }

        setBlogs(response.data);
      })
      .catch(error => {
        if (error.code === "ERR_NETWORK") {
          console.error('Network error:', error);
          router.push('/NetworkError');
        } else if (error.response) {
          console.error('LeftSidebarComponentsBlogs data fetching failed:', error.response.data);
        } else {
          console.error('Error:', error.message);
        }
      });
  }, []);

  return (
    <>
      <div className="mb-10 bg-white rounded-lg shadow p-4">
        <h5 className="text-lg font-semibold mb-2">BLOGS</h5>
        {blogs.length > 0 ? (
          <ul className="space-y-4">
            {blogs.map((blog) => (
              <li key={blog.Bid} className="hover:bg-gray-100 rounded-md transition duration-200 p-2">
                <a href={`/Blogs/${blog.Bauthor.replace(' ', '')}/${blog.Burl}`} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Image className="h-14 w-14 rounded-lg object-cover" src={blog.Bimage || "https://placehold.co/400"} alt="Blog Thumbnail" width={0}
                    height={0}
                    sizes="100vw"
                    style={{ width: '100%', height: 'auto' }} />
                  <div className="flex-1">
                    <span className="text-ms font-medium">{blog.Bname}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      <div className="flex items-center">
                        <Image className="h-8 w-8 rounded-full object-cover" src={blog.BauthorImage || "https://placehold.co/400"} alt="Author" width={0}
                          height={0}
                          sizes="100vw"
                          style={{ width: '100%', height: 'auto' }} />
                        <span className="ml-2 font-medium">{blog.Bauthor}</span>
                      </div>
                      <p className="mt-2"><FontAwesomeIcon icon={faCalendarDays} /> {blog.Bdate}</p>
                      <p><FontAwesomeIcon icon={faFolderOpen} /> {blog.Bcategory}</p>
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faEye} />
                        <span className="ml-2">{blog.Bviews}</span>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-4">
            <span className="text-sm text-gray-500">No blogs found.</span>
          </div>
        )}
      </div>
    </>
  );
}
