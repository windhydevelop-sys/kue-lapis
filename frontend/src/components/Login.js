import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Import the style sheet that recreates the fancy login design
import './Login.css';

const Login = ({ setToken }) => {
  const [form, setForm] = useState({ username: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
    } catch (err) {
      console.error('Login error:', err);
      alert('Login failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="login-page">
      {/* Container replicates the flex-centre behaviour of the example */}
      <div className="container">
        {/* Login form – the "active" class keeps it visible by default */}
        <div className="login-form active">
          <h2>Welcome Back</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="login-btn">Login</button>
            <div className="form-footer">
              <Link className="forgot-link" to="/register">Belum punya akun? Daftar di sini</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;