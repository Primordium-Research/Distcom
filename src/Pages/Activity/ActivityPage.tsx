import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../MogartBase/Context/DataContext';
import Header from '../../MogartBase/ThemeParts/MainPart/Header/HeaderPart';
import Navbar from '../../MogartBase/ThemeParts/MainPart/Navbar/Navbar';
import { API_URL } from '../../MogartBase/Api/Api';
import axios from 'axios';

interface Activity {
  Actid: string;
  ActName: string;
  ActContent: string;
  ActStatus: string;
  ActDate: string;
}

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => (
  <div className="border-b border-gray-200 px-4 py-3">
    <h3 className="text-lg text-gray-800">{activity.ActName}</h3>
    <p className="text-sm text-gray-600">{activity.ActContent}</p>
    <p className="text-xs text-gray-500">{activity.ActDate}</p>
  </div>
);

const ActivityPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, userAuthID,userAuthToken, isLoading,siteData } = useData();
  const [activities, setActivities] = useState<Activity[]>([]);
  const { username } = useParams();

  useEffect(() => {  
    if (isLoading) return;
    if(siteData.SiteStatus != "1") navigate('/');
    if (!isLoggedIn) {
      navigate('/login');
    } else {
      axios.get(`${API_URL}/${username}/GetActivity/General`, {
        headers: {
            'Authorization': `Bearer ${userAuthToken}`
        }
    })
      .then(response => {
        const data = response.data;
        if (Array.isArray(data)) {
          setActivities(data);
        } else {
          console.error('Unexpected structure of data', data);
          setActivities([]);
        }
      })
      .catch(error => {
        if (error.code === "ERR_NETWORK") {
          console.error('Network error:', error);
          navigate('/NetworkError');
        } else if (error.response) {
          console.error('Activity data fetching failed:', error.response.data);
        } else {
          console.error('Error:', error.message);
        }
      });
    }
  }, [isLoggedIn, navigate, userAuthID, isLoading]);

  if (isLoading) return <div className="flex justify-center items-center h-screen">
  <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
  <p className="text-lg text-purple-600 font-semibold ml-4">Loading...</p>
</div>;

  return (
    <>
      <Header />
      <Navbar />
      <div className="flex flex-col h-screen pt-16">
        <main className="flex-1 overflow-y-auto bg-gray-50"> 
          <div className="max-w-4xl mx-auto py-6 sm:py-8 lg:py-12"> 
            <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Activity</h1>
            <div className="bg-white shadow-md rounded-lg overflow-hidden"> 
              {activities.length === 0 ? (
                <p className="text-gray-700 text-center py-5 text-lg">No activity occurred</p> 
              ) : (
                <div className="divide-y divide-gray-200"> 
                  {activities.map((activity) => (
                    <ActivityItem key={activity.Actid} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

    </>
  );
};

export default ActivityPage;