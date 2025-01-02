import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../MogartBase/Context/DataContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentAlt, faPhone, faCheckCircle, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import InfiniteScroll from 'react-infinite-scroll-component';
import Header from '../../MogartBase/ThemeParts/MainPart/Header/HeaderPart';
import Navbar from '../../MogartBase/ThemeParts/MainPart/Navbar/Navbar';
import { API_URL, PostSendMessage, PostUnclockChatData } from '../../MogartBase/Api/Api';
import ChatUserList from './components/ChatUserList/ChatUserList';
import VoiceChat from '../VoiceChat/VoiceChat';
import { isValidChatData, isValidChatDetailData } from '../../MogartBase/Api/Sec-2/Checkers/ChatDataChecker';
import EmojiPicker ,{Emoji, Theme, EmojiStyle }from 'emoji-picker-react';
import axios from 'axios';
import NewChat from './components/NewChat/NewChat';
import { AuthenticationToken, Constants } from '../../MogartBase/MogartZKBase/ZkMogart/Messager';
import { checkMinaProvider, requestAccounts } from '../../MogartBase/WalletProc/Wallet';
import UnlockPopup from './components/AccessChat/AccessChat';
import { CircuitString, Field, PublicKey } from 'o1js';

export interface ChatMessageDetail {
  MessageID: string;
  Sender: string;
  messageText: string;
  messageVideoUrlList: string[];
  messageUrlList: string[];
  messageImageList: string[];
  messageTimeStamp: string;
}

export interface ChatMessage {
  MessageID: string;
  MessageAuthor: string;
  MessageAuthorImage: string;
  MessageAuthorTo: string;
  MessageDate: string;
  MessageLastAction: string;
  MessageActions: string;
}

const MessagePage = () => {
  const { isLoggedIn, isLoading, data,userAuthToken,userAuthID,siteData } = useData();
  const [chatData, setChatData] = useState<ChatMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDetail[]>([]);
  const [isLockPopupVisible, setIsLock] = useState(true);

  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isNewChatModal, setNewChatModalOpen] = useState(false);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  const [longPressTimeoutId, setLongPressTimeoutId] = useState<number | null>(null);
  const [longPress, setLongPress] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentDisplayCount, setCurrentDisplayCount] = useState(10); 
  const [messageContent, setMessageContent] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);


  const [SendMessageContent, setPost] = useState('');
  const [MessageGlobalID, setMessageChatID] = useState('');
  const [MessageSignaturedData, setSignedData] = useState(null as any);

  const navigate = useNavigate();
  useEffect(() => {
    if (longPress) {
      setShowContextMenu(true);
      setLongPress(false); 
    }
  }, [longPress]);
  
  useEffect(() => {
    if (longPress) {
      setShowContextMenu(true);
      setLongPress(false);
    }
  }, [longPress]);

  const handleMouseDown = (messageId: string) => {
    setLongPressTimeoutId(window.setTimeout(() => {
      setLongPress(true);
      setSelectedMessageId(messageId);
    }, 500) as unknown as number);
  };
  
  const handleMouseUp = () => {
    if (longPressTimeoutId !== null) {
      clearTimeout(longPressTimeoutId);
      setLongPressTimeoutId(null);

      if (longPress) {
        setShowContextMenu(true); 
        setLongPress(false);
      }
    }
  };

  const handleUnlock = async (): Promise<void> => {
    try {
        const walletAddresses = await requestAccounts();
        if (walletAddresses && walletAddresses.length > 0) {
            const publicKey = walletAddresses[0];
            const AUTHTOKEN = userAuthToken;
            const timestamp = new Date().getTime();

            const content = `PublicKey: ${publicKey}\nAUTHTOKEN: ${AUTHTOKEN}\nTimestamp: ${timestamp}`;

            const signedData = await window.mina?.signMessage({ message: content }).catch((err: any) => {
                throw err; 
            });

            if (signedData && 'signature' in signedData) {
               const unlockresponse = await PostUnclockChatData({signedData},userAuthToken);
                console.log("Signed Message Data:", unlockresponse);
                setIsLock(false);
            } else {
                console.error("Failed to obtain signed data.");
            }
        } else {
            console.error("Failed to retrieve wallet addresses");
        }
    } catch (error: any) {
        console.error("Error in handleUnlock: ", error);
        if (error.code === 1001) {
            console.error("User disconnected, please connect first.");
        } else if (error.code === 1002) {
            console.error("User rejected the request.");
        } else if (error.code === 23001) {
            console.error("Origin mismatch, check origin safety.");
        }
    }
};

  const handleClose = (): void => {
    setIsLock(false); 
    navigate('/');
  };
  const handleToggleModal = () => {
      setNewChatModalOpen(!isNewChatModal);
  };

  const onEmojiClick = (emojiData:any, event:any) => {
    setMessageContent(prevContent => prevContent + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const fetchMoreData = () => {
    if (currentDisplayCount >= messages.length) {
      setHasMore(false);
    } else {
      setCurrentDisplayCount(currentDisplayCount + 10);
    }
  };

  useEffect(() => {
    if (isLockPopupVisible) return;
    if (isLoading) return;
    if(siteData.SiteStatus != "1") navigate('/');
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
  
    const fetchChatData = async () => {
      try {
        const response = await axios.get(`${API_URL}/ChatData/${data?.UserName}`, {
          headers: {
              'Authorization': `Bearer ${userAuthToken}`
          }
      });
      
      if (!response.data || !Array.isArray(response.data) || response.data.some(chatdata => !isValidChatData(chatdata))) {
        console.error('API response is not an array or contains invalid data');
        return;
      }
      
        setChatData(response.data);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (error.code === "ERR_NETWORK") {
            console.error('Network error:', error);
            navigate('/NetworkError');
          } else if (error.response) {
            console.error('Message data fetching failed:', error.response.data);
          } else {
            console.error('Error:', error.message);
          }
        } else {
          console.error('An unexpected error occurred', error);
        }
      }
    };
    fetchChatData();
  }, [isLoggedIn, isLoading, navigate, data?.UserName,userAuthToken,isLockPopupVisible,isNewChatModal]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (isLockPopupVisible) return;
      if (!selectedChatId) return; 
      try {
        const response = await axios.get(`${API_URL}/ChatData/${data?.UserName}/Messages/${selectedChatId}`, {
          headers: {
            'Authorization': `Bearer ${userAuthToken}`
          }
        });
        if (!response.data || !Array.isArray(response.data)) {
          console.error('API response is invalid or not an array');
          return;
        }
        
        const validMessages = response.data.filter(chatDetailData => !isValidChatDetailData(chatDetailData));
        if (!validMessages.length) {
          console.error('No valid messages received');
          return;
        }

        const chatData = response.data[0].Messages;
        
        try {
          const parsedContent = JSON.parse(chatData) as ChatMessageDetail[];
          if (!Array.isArray(parsedContent) || parsedContent.some(chatDetailData => !isValidChatDetailData(chatDetailData))) {
            console.error('API response is not an array or contains invalid chat detail data');
            return;
          }
          setMessages(parsedContent);
        } catch (error) {
          console.error('Parsing chat data failed:', error);
        }
        
      } catch (error) {
        console.error('Fetching messages failed:', error);
      }
    };
    if(selectedChatId){
      fetchMessages();
    }
  }, [selectedChatId, data?.UserName, userAuthToken,isLockPopupVisible,isNewChatModal]);
   
  const SendMessage = async (selectedChatId:any, messageContent:any) => {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    let urls = messageContent.match(urlRegex) || [];
  
    let videoUrls: string[] = [];
    let imageUrls: string[] = [];
    let otherUrls: string[] = [];
  
    urls.forEach((url: string) => {
      if (url.match(/\.(jpeg|jpg|gif|png)$/)) {
        imageUrls.push(url);
        console.log("Found Image URL: ", url);
      } else if (url.match(/\.(mp4|avi|webm|mov)$/)) {
        videoUrls.push(url);
        console.log("Found Video URL: ", url);
      } else {
        otherUrls.push(url);
        console.log("Found URL: ", url);
      }
    });
  
    let textContent = messageContent.replace(urlRegex, '').trim();
  
    const response = await PostSendMessage({
      selectedChatId,
      messageContent: {
        TextContent: textContent,
        Urls: otherUrls,
        ImageUrls: imageUrls,
        VideoUrls: videoUrls
      }
    }, userAuthToken);
    console.log("MessageSend Response", response);

    // SendMessage'dan sonra mesajları yeniden yükle
    handleFetchMessages(selectedChatId);
};

useEffect(() => {
  if (!selectedChatId) return;
  handleFetchMessages(selectedChatId);
}, [selectedChatId]);

const handleFetchMessages = async (chatId: any) => {
  try {
    const response = await axios.get(`${API_URL}/ChatData/${data?.UserName}/Messages/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${userAuthToken}`
      }
    });
    if (!response.data || !Array.isArray(response.data)) {
      console.error('API response is invalid or not an array');
      return;
    }
    
    const validMessages = response.data.filter(chatDetailData => !isValidChatDetailData(chatDetailData));
    if (!validMessages.length) {
      console.error('No valid messages received');
      return;
    }

    const chatData = response.data[0].Messages;
    
    try {
      const parsedContent = JSON.parse(chatData) as ChatMessageDetail[];
      if (!Array.isArray(parsedContent) || parsedContent.some(chatDetailData => !isValidChatDetailData(chatDetailData))) {
        console.error('API response is not an array or contains invalid chat detail data');
        return;
      }
      setMessages(parsedContent);
    } catch (error) {
      console.error('Parsing chat data failed:', error);
    }
    
  } catch (error) {
    console.error('Fetching messages failed:', error);
  }
};


 
  if (isLoading) return <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
    <p className="text-lg text-purple-600 font-semibold ml-4">Loading...</p>
  </div>;

  const handleChatSelect = async (chatId: string) => {
    if (chatId === selectedChatId) return;
    setSelectedChatId(chatId);
  };

  const handleMessageSelect = async (selectedChatId: any) => {
    setSelectedMessages(selectedChatId);
  };

  const ContextMenu = () => {
    interface Position {
      x: number;
      y: number;
    }
    
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [rel, setRel] = useState<Position | null>(null);

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !rel) return;
    
        let newX = e.pageX - rel.x;
        let newY = e.pageY - rel.y;
    
        const menuWidth = document.getElementById('contextMenu')?.offsetWidth || 0;
        const menuHeight = document.getElementById('contextMenu')?.offsetHeight || 0;
    
        newX = Math.min(window.innerWidth - menuWidth, Math.max(0, newX));
        newY = Math.min(window.innerHeight - menuHeight, Math.max(0, newY));
    
        setPosition({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, rel]);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; 
      const pos: Position = {
        x: e.pageX - position.x,
        y: e.pageY - position.y,
      };
      setRel(pos);
      setIsDragging(true);
      e.stopPropagation();
      e.preventDefault();
    };
    
    useEffect(() => {
      if (messages.length <= currentDisplayCount) {
        setHasMore(false);
      }
    }, [messages, currentDisplayCount]);

    if (!showContextMenu || !selectedMessageId) return null;
    const selectedMessage = messages.find(message => message.MessageID === selectedMessageId);

    const handleCopyMessage = () => {
      if (!selectedMessage) return;
      navigator.clipboard.writeText(selectedMessage.messageText);
      handleMessageSelect("");
      setShowContextMenu(false);
    };

    const handleForwardMessage = () => {
      if (!selectedMessage) return;
      setShowContextMenu(false);
    };

    return (
      <div className="absolute z-20 bg-white rounded-md shadow-xl" id="contextMenu" style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'grab' }} 
      onMouseDown={onMouseDown}>
        
        <h1 className="text-xl font-semibold text-gray-900 bg-gray-100 px-6 py-3">Smart Bar</h1>
        <ul className="flex flex-col">
          <li>
            <button onClick={handleCopyMessage} className="block w-full text-left px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out">
              Copy
            </button>
          </li>
          <li>
            <button onClick={handleForwardMessage} className="block w-full text-left px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out">
              Forward
            </button>
          </li>
        </ul>
      </div>
    );
  };
  return (
    <>
      <UnlockPopup onRequestAccounts={handleUnlock} isVisible={isLockPopupVisible} onClose={handleClose} />
      <Header />
      <Navbar />
      <div className="flex flex-col pl-16 pt-16 bg-gray-100 h-screen min-h-screen">
        <div className="flex flex-grow">
          <div className="flex w-full h-full">
            <div className="w-1/3 border-r border-gray-300 bg-white">
              <div className="p-5 flex justify-between items-center bg-white shadow-sm border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Chats</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsCallModalOpen(true)}
                    className="flex items-center justify-center bg-gradient-to-r from-green-400 to-green-500 text-white rounded-full px-4 py-2 hover:from-green-500 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 shadow transition duration-200 ease-in-out transform hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faPhone} className="text-lg mr-2" />
                    <span>Call</span>
                  </button>
                  <button
                    onClick={() => handleToggleModal()}
                    className="flex items-center justify-center bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-full px-4 py-2 hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 shadow transition duration-200 ease-in-out transform hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faCommentAlt} className="text-lg mr-2" />
                    <span>New Chat</span>
                  </button>
                </div>
              </div>

              <NewChat isOpen={isNewChatModal} setIsOpen={setNewChatModalOpen} />
              <VoiceChat isCallModalOpen={isCallModalOpen} setIsCallModalOpen={setIsCallModalOpen} />
              <ChatUserList chatData={chatData} onChatSelect={handleChatSelect} />
            </div>
  
            <div className="w-2/3 bg-white shadow-lg rounded-lg flex flex-col">
              <div className="flex h-20 px-4 py-2 bg-white border-t border-gray-300 shadow-lg">
              </div>
              {selectedChatId && (
                <InfiniteScroll
                  dataLength={currentDisplayCount}
                  next={fetchMoreData}
                  hasMore={hasMore}
                  loader={messages.length > 0 && (<h4 className='text-center text-lg text-purple-600 font-semibold ml-4'>Loading...</h4>)}
                  endMessage={
                    <p style={{textAlign: 'center', backgroundColor: 'ButtonFace', fontSize: '9px'}}>
                      <b>Yay! Your conversation ended here.</b>
                    </p>
                  }
                  scrollableTarget="scrollableDiv"
                >
                  <div
                    id="scrollableDiv"
                    className="flex-1 p-4 bg-white overflow-y-auto"
                    style={{ maxHeight: '600px' }}
                  >
                    {messages.map((message, index) => {
                      const isUserMessage = message.Sender === data?.UserName;
                      const isSelected = selectedMessages.includes(message.MessageID);
                      const messageClasses = `relative max-w-2xl w-full p-4 rounded-lg shadow ${
                        isUserMessage ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 border border-gray-300'
                      } ${isSelected ? (isUserMessage ? 'border-r-4 border-green-700' : 'border-l-4 border-green-500') : ''}`;
                      const iconPosition = isUserMessage ? '-top-3 -right-3' : '-top-3 -left-3';
                      return (
                        <div
                          key={index}
                          onMouseDown={() => handleMouseDown(message.MessageID)}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                          className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} my-2`}
                        >
                          <div
                            className={messageClasses}
                            onClick={() => handleMessageSelect(message.MessageID)}
                            style={{ cursor: 'pointer' }}
                          >
                            {isSelected && (
                              <div className={`absolute ${iconPosition}`}>
                                <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                              </div>
                            )}
                            <p className="whitespace-pre-line break-words">{message.messageText}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </InfiniteScroll>
              )}
            {selectedChatId && (
              <div className="flex px-4 py-2 bg-slate-100 border-t border-gray-300">
                {showEmojiPicker && (
                  <div className="absolute inset-y-auto bottom-64 px-4 mb-4 z-20">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      theme={Theme.LIGHT}
                      emojiStyle={EmojiStyle.APPLE}
                      searchPlaceholder="Search..."
                      className="max-h-96 overflow-y-auto w-full"
                    />
                  </div>
                )}
                <div className="flex items-center w-full">
                 <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="flex-1 rounded-full border-gray-300 p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
                    placeholder="Type a message..."
                    rows={1}
                    style={{ minHeight: '40px' }} 
                  />

                  <button
                    className="bg-white text-gray-500 rounded-full px-6 py-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg transition duration-150 ease-in-out ml-2"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    😊
                  </button>
                  <button
                    className="bg-white text-blue-500 rounded-full px-6 py-2 hover:bg-slate-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md hover:shadow-lg transition duration-150 ease-in-out ml-2"
                    onClick={() => SendMessage(selectedChatId, messageContent)}
                  >
                    <FontAwesomeIcon icon={faPaperPlane} className="h-5 w-5" /> Send
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MessagePage;
