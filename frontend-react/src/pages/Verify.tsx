import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiMail, FiCheck } from 'react-icons/fi';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

// Define validation schema
const verifySchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    confirmationCode: z.string().min(6, 'Confirmation code must be at least 6 characters'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

const VerifyPage: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Get email from location state if available
    const emailFromState = location.state?.email || '';

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<VerifyFormValues>({
        resolver: zodResolver(verifySchema),
        defaultValues: {
            email: emailFromState,
        },
    });

    const onSubmit = async (data: VerifyFormValues) => {
        setIsSubmitting(true);
        try {
            await authAPI.confirmRegistration(data.email, data.confirmationCode);
            toast.success('Email verified successfully! You can now log in.');
            navigate('/login');
        } catch (error) {
            console.error('Verification error:', error);
            toast.error('Verification failed. Please check your code and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Verify your email
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Please enter the verification code sent to your email
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            id="email"
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            icon={<FiMail className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.email?.message}
                            disabled={!!emailFromState}
                            {...register('email')}
                        />

                        <Input
                            id="confirmationCode"
                            label="Confirmation Code"
                            type="text"
                            autoComplete="one-time-code"
                            icon={<FiCheck className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.confirmationCode?.message}
                            {...register('confirmationCode')}
                        />

                        <div>
                            <Button
                                type="submit"
                                fullWidth
                                loading={isSubmitting}
                            >
                                Verify Email
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already verified?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-blue-700 hover:text-blue-800"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyPage; 