"use client"
import { faArrowDown, faArrowUp, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_URL } from '../../../../../../Api/Api';

const MostPopularMember = () => {
  const [mostPopularMembers, setMostPopularMembers] = useState<{ Mpid: number; MpAvatar: string; MpUsername: string; MpUserID: string, MpPoints: string, MpTrend: string }[]>([]);
  const router = useRouter();

  useEffect(() => {
    axios.get(`${API_URL}/GetMPM`)
      .then((response) => {
        const data = response.data;
        setMostPopularMembers(data);
      })
      .catch(error => {
        if (error.code === "ERR_NETWORK") {
          console.error('Network error:', error);
          router.push('/NetworkError');
        } else if (error.response) {
          console.error('MostPopularMember data fetching failed:', error.response.data);
        } else {
          console.error('Error:', error.message);
        }
      });
  }, []);

  return (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-lg">
      <h5 className="text-lg font-semibold mb-4">Most Popular Members</h5>
      <div className="bg-white p-4 rounded-lg">
        {mostPopularMembers.map((member) => (
          <div key={member.Mpid} className="py-2 hover:bg-gray-100 rounded-md transition duration-200 ease-in-out flex justify-between items-center">
            <Link href={`Profile/${member.MpUsername}`} className="flex items-center space-x-3">
              <Image className="h-10 w-10 rounded-full object-cover border-2 border-gray-300" src={member.MpAvatar} alt={member.MpUsername} width={0}
                height={0}
                sizes="100vw"
                style={{ width: '100%', height: 'auto' }} />
              <div>
                <span className="text-sm font-medium text-gray-800">{member.MpUsername}</span>
              </div>
            </Link>
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-gray-600 mx-6 hover:text-gray-800 transition duration-150 ease-in-out transform hover:scale-105 shadow-md">
                {member.MpPoints} Points
              </span>

              {member.MpTrend === 'up' ? (
                <FontAwesomeIcon icon={faArrowUp} className="text-green-500" />
              ) : member.MpTrend === 'down' ? (
                <FontAwesomeIcon icon={faArrowDown} className="text-red-500" />
              ) : (
                <FontAwesomeIcon icon={faShieldAlt} className="text-blue-500" />
              )
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default MostPopularMember;
