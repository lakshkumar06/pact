import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui'
import axios from 'axios'
import { ContractEditor } from './components/ContractEditor'
import { CommitView } from './components/CommitView'
import { DiffViewer } from './components/DiffViewer'
import { VersionSidebar } from './components/VersionSidebar'
import { HistoryPage } from './components/HistoryPage'
import { VersionCompareModal } from './components/VersionCompareModal'
import { WalletPrompt } from './components/WalletPrompt'
import { Dashboard } from './components/Dashboard'
import { CreateContractForm } from './components/CreateContractForm'
import { LoginForm } from './components/auth/LoginForm'
import { EmailRegisterForm } from './components/auth/EmailRegisterForm'
import { WalletRegisterForm } from './components/auth/WalletRegisterForm'
import { InvitationPage } from './components/auth/InvitationPage'
import ProfileSettings from './components/auth/ProfileSettings'
import { ContractDetailView } from './components/contracts/ContractDetailView'
import './App.css'
import Home from './components/Home'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

function App() {
  const { publicKey, connected, disconnect } = useWallet()
  const [user, setUser] = useState(null)
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showWalletRegister, setShowWalletRegister] = useState(false)
  const [showEmailRegister, setShowEmailRegister] = useState(false)
  const [showWalletPrompt, setShowWalletPrompt] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [contractMembers, setContractMembers] = useState([])
  const [contractInvitations, setContractInvitations] = useState([])
  const [invitationData, setInvitationData] = useState(null)
  const [showInvitationPage, setShowInvitationPage] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  // Auth0 removed — using local JWT stored in localStorage
  const [contractVersions, setContractVersions] = useState([])
  const [contractHistory, setContractHistory] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [compareVersions, setCompareVersions] = useState([])

  useEffect(() => {
    // Check if this is an invitation link
    const path = window.location.pathname
    if (path.startsWith('/invite/')) {
      const token = path.split('/invite/')[1]
      loadInvitationData(token)
      return
    }

    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      loadDashboard()
      return
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (connected && publicKey && user && !user.wallet_address) {
      // User is logged in but doesn't have wallet connected, update it
      updateUserWallet()
      setShowWalletPrompt(false)
    } else if (connected && publicKey && !user) {
      // User not logged in, try wallet auth
      handleWalletAuth()
    }
  }, [connected, publicKey, user])

  const handleWalletAuth = async () => {
    try {
      const walletAddress = publicKey.toString()
      const res = await axios.post(`${API_BASE}/auth/login`, { 
        wallet_address: walletAddress 
      })
      localStorage.setItem('token', res.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      setUser(res.data.user)
      await loadDashboard()
    } catch (error) {
      console.error('Wallet auth failed:', error)
      // If wallet doesn't exist, show registration form
      setShowWalletRegister(true)
    }
  }

  const loadDashboard = async () => {
    try {
      const [userRes, contractsRes] = await Promise.all([
        axios.get(`${API_BASE}/auth/me`),
        axios.get(`${API_BASE}/contracts`)
      ])
      setUser(userRes.data.user)
      setContracts(contractsRes.data.contracts)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
      localStorage.removeItem('token')
    }
    setLoading(false)
  }

  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password })
      localStorage.setItem('token', res.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      setUser(res.data.user)
      await loadDashboard()
      setShowLogin(false)
    } catch (error) {
      alert('Login failed')
    }
  }

  const handleRegister = async (name, email, password) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, { name, email, password })
      localStorage.setItem('token', res.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      setUser(res.data.user)
      setShowLogin(false)
      setShowRegister(false)
      setShowEmailRegister(false)
      // After email registration, if wallet not connected, show wallet prompt
      if (!connected) {
        setShowWalletPrompt(true)
      }
    } catch (error) {
      alert('Registration failed')
    }
  }

  const handleWalletRegister = async (name, email, password) => {
    try {
      const walletAddress = publicKey.toString()
      const res = await axios.post(`${API_BASE}/auth/register`, { 
        name, 
        email, 
        password,
        wallet_address: walletAddress 
      })
      localStorage.setItem('token', res.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      setUser(res.data.user)
      setShowWalletRegister(false)
      await loadDashboard()
    } catch (error) {
      alert('Wallet registration failed')
    }
  }

  const updateUserWallet = async () => {
    try {
      const walletAddress = publicKey.toString()
      await axios.patch(`${API_BASE}/auth/wallet`, { wallet_address: walletAddress })
      await loadDashboard()
    } catch (error) {
      console.error('Failed to update wallet:', error)
    }
  }

  const createContract = async (title, description, fileContent) => {
    try {
      // First create contract in database
      const res = await axios.post(`${API_BASE}/contracts`, { title, description })
      const contract = res.data.contract
      const contractId = contract.id
      
      // Process file with AI if provided
      if (fileContent) {
        await axios.post(`${API_BASE}/contracts/${contractId}/process`, { fileContent })
      }
      
      await loadDashboard()
    } catch (error) {
      console.error('Failed to create contract:', error);
      alert('Failed to create contract')
    }
  }

  const loadContractDetails = async (contractId) => {
    try {
      const [membersRes, invitationsRes, versionsRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/contracts/${contractId}/members`),
        axios.get(`${API_BASE}/contracts/${contractId}/invitations`),
        axios.get(`${API_BASE}/contracts/${contractId}/versions`),
        axios.get(`${API_BASE}/contracts/${contractId}/history`)
      ])
      console.log('Loaded members:', membersRes.data.members)
      console.log('Loaded invitations:', invitationsRes.data.invitations)
      setContractMembers(membersRes.data.members || [])
      setContractInvitations(invitationsRes.data.invitations || [])
      setContractVersions(versionsRes.data.versions || [])
      setContractHistory(historyRes.data.history || [])
    } catch (error) {
      console.error('Failed to load contract details:', error)
      // Set empty arrays on error to prevent stale data
      setContractMembers([])
      setContractInvitations([])
      setContractVersions([])
      setContractHistory([])
    }
  }

  const createInvitation = async (contractId, email, wallet_address, role_in_contract) => {
    try {
      const res = await axios.post(`${API_BASE}/contracts/${contractId}/invite`, {
        email,
        wallet_address,
        role_in_contract
      })
      await loadContractDetails(contractId)
      return res.data.invitation
    } catch (error) {
      alert('Failed to create invitation')
      throw error
    }
  }

  const resendInvitation = async (invitationId) => {
    try {
      const res = await axios.post(`${API_BASE}/contracts/invite/${invitationId}/resend`)
      alert('Invitation link resent!')
      await loadContractDetails(selectedContract.id)
      return res.data.invitation
    } catch (error) {
      alert('Failed to resend invitation')
      throw error
    }
  }

  const createVersion = async (contractId, content, commitMessage) => {
    try {
      const res = await axios.post(`${API_BASE}/contracts/${contractId}/versions`, {
        content,
        commit_message: commitMessage
      })
      await loadContractDetails(contractId)
      return res.data.version
    } catch (error) {
      console.error('Error creating version:', error)
      throw error
    }
  }

  const handleSelectVersion = (version) => {
    setSelectedVersion(version)
  }

  const handleCompareVersions = (versions) => {
    setCompareVersions(versions)
    setShowCompareModal(true)
  }

  const loadInvitationData = async (token) => {
    try {
      const res = await axios.get(`${API_BASE}/contracts/invite/${token}`)
      setInvitationData(res.data.invitation)
      setShowInvitationPage(true)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load invitation:', error)
      alert('Invalid or expired invitation link')
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!user) {
      alert('Please login first to accept the invitation')
      return
    }

    try {
      const token = window.location.pathname.split('/invite/')[1]
      // Ensure we have an Authorization header: prefer existing axios default, otherwise try Auth0
      const localToken = localStorage.getItem('token')
      if (!axios.defaults.headers.common['Authorization'] && localToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${localToken}`
      }

      await axios.post(`${API_BASE}/contracts/invite/${token}/accept`)
      alert('Successfully joined the contract!')
      // Redirect to dashboard
      window.location.href = '/'
    } catch (error) {
      if (error.response?.status === 403) {
        alert('Email address does not match invitation. Please login with the correct email.')
      } else {
        alert('Failed to accept invitation')
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setContracts([])
    if (connected) {
      disconnect()
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  if (showInvitationPage) {
    return (
      <InvitationPage 
        invitation={invitationData}
        user={user}
        onLogin={() => setShowLogin(true)}
        onRegister={() => setShowEmailRegister(true)}
        onAccept={acceptInvitation}
      />
    )
  }

  if (!user) {
    return (
      <>
        <Home 
          onShowLogin={() => setShowLogin(true)} 
          onShowEmailRegister={() => setShowEmailRegister(true)} 
          onShowWalletRegister={() => setShowWalletRegister(true)}
        />

        {/* Render auth forms as overlays when requested */}
        {showLogin && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md">
              <LoginForm onLogin={handleLogin} onSwitch={() => setShowLogin(false)} />
            </div>
          </div>
        )}

        {showEmailRegister && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md">
              <EmailRegisterForm onRegister={handleRegister} onSwitch={() => setShowEmailRegister(false)} />
            </div>
          </div>
        )}

        {showWalletRegister && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md">
              <WalletRegisterForm 
                onRegister={handleWalletRegister} 
                onSwitch={() => setShowWalletRegister(false)}
                walletAddress={publicKey?.toString()}
              />
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
  <nav className="bg-linear-to-r from-indigo-600 to-teal-500 text-white shadow-md fixed top-0 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
              <div className="flex items-center">
                <a href="/" aria-label="Home">
                  <img src="/logo.png" alt="Agreed logo" className="h-12 w-auto mr-2" />
                </a>
              </div>
              <div className="flex items-center space-x-4">
              <button onClick={() => setShowProfileSettings(true)} className="text-sm text-white/90 hover:underline">{user.name}</button>
              {connected && (
                <div className="text-xs text-white/80">
                  {publicKey?.toString().slice(0, 8)}...
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-white/90 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="">
        {showWalletPrompt ? (
          <WalletPrompt onSkip={() => setShowWalletPrompt(false)} />
        ) : selectedContract ? (
          <>
            <ContractDetailView 
              contract={selectedContract}
              members={contractMembers}
              invitations={contractInvitations}
              currentUserId={user?.id}
              versions={contractVersions}
              history={contractHistory}
              selectedVersion={selectedVersion}
              onBack={() => {
                setSelectedContract(null)
                setSelectedVersion(null)
              }}
              onInvite={createInvitation}
              onResend={resendInvitation}
              onRefresh={() => loadContractDetails(selectedContract.id)}
              onCreateVersion={(content, commitMessage) => createVersion(selectedContract.id, content, commitMessage)}
              onSelectVersion={handleSelectVersion}
              onCompareVersions={handleCompareVersions}
            />
            {showCompareModal && compareVersions.length === 2 && (
              <VersionCompareModal
                contractId={selectedContract.id}
                version1={compareVersions[0]}
                version2={compareVersions[1]}
                onClose={() => setShowCompareModal(false)}
              />
            )}
          </>
        ) : (
          <Dashboard 
            user={user}
            contracts={contracts} 
            onCreateContract={createContract}
            onRefresh={loadDashboard}
            onSelectContract={(contract) => {
              setSelectedContract(contract)
              loadContractDetails(contract.id)
            }}
          />
        )}
      </div>
      {showProfileSettings && (
        <ProfileSettings user={user} onClose={() => setShowProfileSettings(false)} onSave={(u) => setUser(u)} />
      )}
    </div>
  )
}

export default App
