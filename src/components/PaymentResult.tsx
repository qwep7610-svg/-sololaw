import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { db, doc, setDoc, collection, serverTimestamp, handleFirestoreError, OperationType } from '../lib/firebase';

interface PaymentResultProps {
  type: 'success' | 'fail';
  onNavigate: (view: any) => void;
}

export default function PaymentResult({ type, onNavigate }: PaymentResultProps) {
  const [status, setStatus] = useState<'loading' | 'completed' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (type === 'fail') {
      setStatus('error');
      const params = new URLSearchParams(window.location.search);
      setMessage(params.get('message') || '결제 등록 중 오류가 발생했습니다.');
      return;
    }

    const processSuccess = async () => {
      const params = new URLSearchParams(window.location.search);
      const authKey = params.get('authKey');
      const customerKey = params.get('customerKey');
      
      const pendingSub = localStorage.getItem('pending_subscription');
      if (!pendingSub || !authKey) {
        setStatus('error');
        setMessage('결제 정보가 유효하지 않습니다.');
        return;
      }

      try {
        const { planType, amount, lawyerId, planName } = JSON.parse(pendingSub);
        
        // 1. Exchange authKey for billingKey on the server
        const billingKeyRes = await fetch('/api/toss/billing-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authKey, customerKey })
        });

        if (!billingKeyRes.ok) {
          const errorData = await billingKeyRes.json();
          throw new Error(errorData.message || '빌링키 발급에 실패했습니다.');
        }

        const { billingKey } = await billingKeyRes.json();

        // 2. Perform initial charge
        const chargeRes = await fetch('/api/toss/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billingKey,
            amount,
            customerKey: lawyerId,
            orderName: `SoloLaw Partnership ${planName} 광고료`
          })
        });

        if (!chargeRes.ok) {
          const errorData = await chargeRes.json();
          throw new Error(errorData.message || '첫 결제 승인에 실패했습니다.');
        }

        const chargeData = await chargeRes.json();

        // 3. Update user document with billing key
        await setDoc(doc(db, 'users', lawyerId), {
          billingKey: billingKey,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 4. Create subscription record
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        await setDoc(doc(db, 'subscriptions', lawyerId), {
          lawyerId,
          billingKey,
          status: 'active',
          planType,
          amount,
          nextBillingDate,
          updatedAt: serverTimestamp()
        });

        // 5. Update lawyer document
        await setDoc(doc(db, 'lawyers', lawyerId), {
          hasActiveSubscription: true,
          subscriptionPlan: planType,
          subscriptionExpiresAt: nextBillingDate,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 6. Record payment in history
        await setDoc(doc(collection(db, 'payments')), {
          lawyerId,
          amount,
          planName: `${planName} 플랜`,
          date: serverTimestamp(),
          status: 'completed',
          tossPaymentKey: chargeData.paymentKey,
          orderId: chargeData.orderId
        });

        localStorage.removeItem('pending_subscription');
        setStatus('completed');
        setMessage('정기 결제 등록 및 첫 결제가 성공적으로 완료되었습니다.');
      } catch (error: any) {
        console.error('Payment processing error:', error);
        setStatus('error');
        setMessage(error.message || '결제 처리 중 오류가 발생했습니다.');
      }
    };

    processSuccess();
  }, [type]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 text-center space-y-6"
      >
        {status === 'loading' ? (
          <>
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">결제 처리 중...</h2>
            <p className="text-slate-500">결제 정보를 안전하게 확인하고 있습니다.</p>
          </>
        ) : status === 'completed' ? (
          <>
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">등록 완료!</h2>
            <p className="text-slate-500 leading-relaxed">{message}</p>
            <button
              onClick={() => onNavigate('lawyer_reg')}
              className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-700 transition-all"
            >
              내 프로필로 돌아가기 <ArrowRight className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">등록 실패</h2>
            <p className="text-slate-500 leading-relaxed">{message}</p>
            <button
              onClick={() => onNavigate('lawyer_reg')}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
            >
              다시 시도하기
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
