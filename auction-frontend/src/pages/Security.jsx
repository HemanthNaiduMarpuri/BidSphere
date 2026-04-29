import { useState } from "react"
import Navbar from "../components/Navbar"
import ProfileLayout from "../components/ProfileLayout"
import { notify } from "../services/notify"
import { authAPI } from "../services/api"
import { Eye, EyeOff } from 'lucide-react';

export default function Security() {
    const [password, setPassword] = useState({
        old_password: '',
        new_password: ''
    })
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const handleChangePassword = async () => {
        try {
            await authAPI.changePassword(password)

            notify.success('Password updated, please login again')

            localStorage.clear()
            window.location.href = '/login'

        } catch (err) {
            notify.error(err.response?.data?.error || 'Failed to update password')
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />

            <ProfileLayout>

                <h2 style={{
                    fontSize: 24,
                    marginBottom: '1rem'
                }}>
                    Change Password
                </h2>

                <div style={{
                    width: '100%',
                    maxWidth: 480,
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '2rem'
                }}>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <label>Old Password</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                name='password'
                                type={showOldPassword ? 'text' : 'password'}
                                placeholder="Enter Old password"
                                value={password.old_password}
                                onChange={(e) =>
                                    setPassword({ ...password, old_password: e.target.value })
                                }
                                required
                                style={{ width: '100%', paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    color: '#666'
                                }}
                            >
                                {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="input-group" style={{ position: 'relative' }}>
                        <label>New Password</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                name='password'
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Enter New password"
                                value={password.new_password}
                                onChange={(e) =>
                                    setPassword({ ...password, new_password: e.target.value })
                                }
                                required
                                style={{ width: '100%', paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    color: '#666'
                                }}
                            >
                                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        style={{ marginTop: 12 }}
                        onClick={() => handleChangePassword()}
                    >
                        Update Password
                    </button>

                </div>

            </ProfileLayout>
        </div>
    )
}