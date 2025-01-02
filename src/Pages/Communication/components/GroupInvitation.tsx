import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, ApiResponseError, PostAcceptGroupsRequest, PostRejectGroupsRequest } from '../../../MogartBase/Api/Api';
import { useData } from '../../../MogartBase/Context/DataContext';
import { isValidGroupRequest } from '../../../MogartBase/Api/Sec-1/Checkers/GroupInvitationChecker';

export interface GroupInvitation {
  ID: string;
  ReqAuthor: string;
  ReqAuthorImage: string;
  ReqContent: string;
  ReqDate: string;
  ReqResponse: string;
  ReqStatus: string; 
  ReqTitle: string;
  ReqType: string;
}
  
const GroupInvitations = () => {
 const [requests, setRequests] = useState<GroupInvitation[]>([]);
 const { isLoggedIn, isLoading, data, userAuthToken } = useData();
 const [acceptingId, setAcceptingId] = useState<string | null>(null);
 const [rejectingId, setRejectingId] = useState<string | null>(null);

 useEffect(() => {
  if (isLoading || !isLoggedIn)  return;

  const fetchGroupRequests = async () => {
    try {
      setRequests([]);
      const response = await axios.get<GroupInvitation[] | ApiResponseError>(`${API_URL}/GetRequest/${data?.UserName}/Group`, {
        headers: {
            'Authorization': `Bearer ${userAuthToken}`
        }
      });  

    if (Array.isArray(response.data)) {
      response.data.forEach(item => {
        if ('IsNull' in item && item.IsNull) {
          setRequests([]);
          return;
        } else if ('ErrorMessage' in item && 'ErrorCode' in item) {
          console.error(`Server error: ${item.ErrorMessage} (Code: ${item.ErrorCode})`);
          setRequests([]);
          return;
        } else if (isValidGroupRequest(item)) {
          setRequests(prev => {
            const exists = prev.some(request => request.ID === item.ID);
            return exists ? prev : [...prev, item];
          });
        }
      });
      } else {
        console.error('API response is not an array or contains invalid data');
        setRequests([]);
      }
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    }
  };

  if (!isLoading || isLoggedIn) fetchGroupRequests();
}, [isLoading,isLoggedIn]);


  const handleAccept = async (invitationId:any) => {
    if (!data?.UserName) return;
    try {
      const acceptresponse = await PostAcceptGroupsRequest({ UserName: data.UserName, RequestId:invitationId, type:"Group", codex:"0x17" },userAuthToken);
      if (acceptresponse[0].status && acceptresponse[0].send) {
        setAcceptingId(invitationId);
        setTimeout(() => {
          setRequests(prev => prev.filter(request => request.ID !== invitationId));
          setAcceptingId(null);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to accept AcceptGroupsRequest:', error);
    }
  };

  const handleReject = async (invitationId:any) => {
    if (!data?.UserName) return;
    try {
      const rejectresponse = await PostRejectGroupsRequest({ UserName: data.UserName, RequestId:invitationId, type:"Group", codex:"0x19" },userAuthToken);
      if (rejectresponse[0].status && rejectresponse[0].send) {
        setRejectingId(invitationId);
        setTimeout(() => {
          setRequests(prev => prev.filter(request => request.ID !== invitationId));
          setRejectingId(null);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to reject RejectGroupsRequest:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50">
       <h2 className="text-xl font-semibold mb-4 text-center text-gray-800">Group Invitations</h2>
      {requests.length > 0 ? (
        <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {requests.map((request) => (
              <div key={request.ID} className={`bg-white rounded-lg shadow hover:shadow-xl transition duration-300 ease-in-out p-4 flex flex-col ${acceptingId === request.ID ? 'fade-out-bounce' : rejectingId === request.ID ? 'fade-out-reject' : ''}`}>
                <img src={request.ReqAuthorImage} alt="Profile" className="w-24 h-24 rounded-full object-cover mx-auto mb-4"/>
                <div className="text-center">
                  <h3 className="text-md font-bold text-gray-900">{request.ReqAuthor}</h3>
                  <p className="text-xs text-gray-500 mb-2">{request.ReqDate}</p>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">{request.ReqTitle}</h4>
                  <p className="text-sm text-gray-700 mb-4">{request.ReqContent.length > 100 ? `${request.ReqContent.substring(0, 100)}...` : request.ReqContent}</p>
                  <p className={`text-xs font-semibold mb-4 ${request.ReqStatus === 'Pending' ? 'text-yellow-500' : request.ReqStatus === 'Accepted' ? 'text-green-500' : 'text-red-500'}`}>{request.ReqStatus}</p>
                  {request.ReqResponse && (
                    <p className="text-xs text-gray-500 italic mb-4">" {request.ReqResponse} "</p>
                  )}
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => handleAccept(request.ID)} className="px-4 py-2 text-sm bg-green-400 text-white rounded hover:bg-green-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 shadow">Accept</button>
                    <button onClick={() => handleReject(request.ID)} className="px-4 py-2 text-sm bg-red-400 text-white rounded hover:bg-red-500 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 shadow">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-800">No Group requests at the moment.</p>
      )}
    </div>
  );
  
  
};

export default GroupInvitations;
