import { useState, useEffect } from 'react';
import { paystackAPI } from '../services/paystack';

const TestPaystack = () => {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const testPayment = async () => {
    setStatus('loading');
    setMessage('Testing payment initialization...');
    
    try {
      const result = await paystackAPI.initializePayment(
        'test@example.com',
        10.00,
        { test: true }
      );
      
      setStatus('completed');
      setMessage(`Result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    console.log('TestPaystack mounted');
    testPayment();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Paystack Integration Test</h1>
      <div style={{ margin: '20px 0', padding: '15px', background: '#f0f0f0', borderRadius: '5px' }}>
        <p><strong>Status:</strong> {status}</p>
        <pre>{message}</pre>
      </div>
      <button 
        onClick={testPayment}
        style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Test Again
      </button>
    </div>
  );
};

export default TestPaystack;