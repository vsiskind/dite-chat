import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/AppIcon';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

const ACCENT_COLOR = '#7C3AED';
const HEADER_BG_COLOR = '#6B21A8';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : '';
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { verifyOTP, resendVerificationEmail } = useSupabaseAuth();
  
  // Create refs for each input field
  const inputRefs = useRef<Array<TextInput | null>>([]);
  
  // Setup cooldown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Check if already verified when component mounts
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If the user has already verified their email, redirect to the app
        if (session?.user?.email_confirmed_at && session.user.email === email) {
          console.log('Email already verified, redirecting to app');
          router.replace('/(tabs)');
        } else if (email && resendCooldown === 0) {
          // Otherwise, send a verification email if needed
          console.log('Email not verified yet, sending verification email');
          handleResendCode();
        }
      } catch (err) {
        console.error('Error checking verification status:', err);
      }
    };
    
    checkVerificationStatus();
  }, [email]);
  
  // Handle input changes and auto-focus next input
  const handleCodeChange = (text: string, index: number) => {
    // Update the code array
    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);
    
    // Auto focus logic
    if (text.length === 1 && index < 5) {
      // Focus next input
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  // Handle backspace key
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && !verificationCode[index]) {
      // Focus previous input when backspace is pressed on an empty input
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  // Handle verification code submission
  const handleVerify = async () => {
    // Combine code digits
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to verify email: ${email} with code: ${code}`);
      
      // Verify OTP with Supabase - using the OTP method
      const { error, data } = await verifyOTP(email, code);
      
      if (error) {
        console.error('Verification failed:', error);
        throw error;
      }
      
      console.log('Verification successful:', data);
      
      // Successfully verified and signed in
      if (data?.session) {
        Alert.alert(
          'Email Verified',
          'Your email has been successfully verified. You will now be redirected to the app.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      } else {
        // Verification successful but not signed in
        Alert.alert(
          'Email Verified',
          'Your email has been successfully verified. Please sign in to continue.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/auth/sign-in')
            }
          ]
        );
      }
    } catch (err: any) {
      console.error('Verification error details:', err);
      setError(err.message || err.originalError || 'Failed to verify your email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Resend verification email
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Resending verification email to: ${email}`);
      const { error } = await resendVerificationEmail(email);
      
      if (error) {
        console.error('Error resending code:', error);
        throw error;
      }
      
      console.log('Verification email sent successfully');
      
      // Set cooldown timer for 60 seconds
      setResendCooldown(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };
  
  const navigateToSignIn = () => {
    router.replace('/auth/sign-in');
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <AppIcon name="mail" size={48} color="#FFFFFF" outline={false} />
          </View>
          <Text style={styles.appName}>Email Verification</Text>
          <Text style={styles.tagline}>Enter the code sent to your email</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to:
          </Text>
          <Text style={styles.emailText}>{email}</Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <AppIcon name="alert-circle" size={20} color="#EF4444" outline={false} />
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
          
          <View style={styles.codeContainer}>
            {verificationCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={el => inputRefs.current[index] = el}
                style={styles.codeInput}
                value={digit}
                onChangeText={text => handleCodeChange(text.replace(/[^0-9]/g, ''), index)}
                keyboardType="number-pad"
                maxLength={1}
                onKeyPress={e => handleKeyPress(e, index)}
                editable={!isLoading}
                autoFocus={index === 0}
              />
            ))}
          </View>
          
          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Verify Email</Text>
            )}
          </Pressable>
          
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <Pressable
              onPress={handleResendCode}
              disabled={resendCooldown > 0 || isLoading}
            >
              <Text style={[
                styles.resendButton,
                (resendCooldown > 0 || isLoading) && styles.resendButtonDisabled
              ]}>
                {resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s` 
                  : 'Resend Code'}
              </Text>
            </Pressable>
          </View>
          
          <Pressable onPress={navigateToSignIn} style={styles.backButton}>
            <AppIcon name="arrow-back" size={20} color="#666" outline={true} />
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: HEADER_BG_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: ACCENT_COLOR,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  error: {
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: ACCENT_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666666',
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_COLOR,
    marginLeft: 6,
  },
  resendButtonDisabled: {
    color: '#9CA3AF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },
});