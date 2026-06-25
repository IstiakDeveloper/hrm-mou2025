<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeLoanTransaction extends Model
{
    public const TYPE_DISBURSEMENT = 'disbursement';

    public const TYPE_INSTALLMENT = 'installment';

    public const TYPE_MANUAL_PAYMENT = 'manual_payment';

    public const TYPE_LEGACY_PAYMENT = 'legacy_payment';

    public const TYPE_COLLECTION = 'collection';

    public const TYPE_ADVANCE_COLLECTION = 'advance_collection';

    public const TYPE_REBATE = 'rebate';

    public const TYPE_WAIVE = 'waive';

    public const TYPE_TRANSFER = 'transfer';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_REVERSAL = 'reversal';

    /** @var list<string> */
    public const CORRECTABLE_TYPES = [
        self::TYPE_DISBURSEMENT,
        self::TYPE_LEGACY_PAYMENT,
        self::TYPE_MANUAL_PAYMENT,
        self::TYPE_COLLECTION,
        self::TYPE_ADVANCE_COLLECTION,
        self::TYPE_ADJUSTMENT,
    ];

    /** @var list<string> */
    public const COLLECTION_TYPES = [
        self::TYPE_MANUAL_PAYMENT,
        self::TYPE_COLLECTION,
        self::TYPE_ADVANCE_COLLECTION,
        self::TYPE_REBATE,
        self::TYPE_WAIVE,
    ];

    protected $fillable = [
        'employee_id',
        'employee_loan_id',
        'employee_loan_installment_id',
        'loan_collection_batch_id',
        'transaction_type',
        'debit_amount',
        'credit_amount',
        'balance_after',
        'payslip_id',
        'payroll_run_id',
        'payroll_year',
        'payroll_month',
        'transaction_date',
        'notes',
        'reference_no',
        'created_by',
    ];

    protected $casts = [
        'debit_amount' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function loan(): BelongsTo
    {
        return $this->belongsTo(EmployeeLoan::class, 'employee_loan_id');
    }

    public function installment(): BelongsTo
    {
        return $this->belongsTo(EmployeeLoanInstallment::class, 'employee_loan_installment_id');
    }

    public function collectionBatch(): BelongsTo
    {
        return $this->belongsTo(LoanCollectionBatch::class, 'loan_collection_batch_id');
    }

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
