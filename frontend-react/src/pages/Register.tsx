import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

// Define validation schema
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setIsSubmitting(true);
        try {
            await registerUser({
                name: data.name,
                email: data.email,
                password: data.password,
            });
            navigate('/verify', { state: { email: data.email } });
        } catch (error) {
            console.error('Registration error:', error);
            // Error handling is done in the auth context
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                    Create a new account
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            id="name"
                            label="Full Name"
                            type="text"
                            autoComplete="name"
                            icon={<FiUser className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.name?.message}
                            {...register('name')}
                        />

                        <Input
                            id="email"
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            icon={<FiMail className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            autoComplete="new-password"
                            icon={<FiLock className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.password?.message}
                            {...register('password')}
                        />

                        <Input
                            id="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            autoComplete="new-password"
                            icon={<FiLock className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />

                        <div>
                            <Button
                                type="submit"
                                fullWidth
                                loading={isSubmitting}
                            >
                                Register
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
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

export default RegisterPage; 