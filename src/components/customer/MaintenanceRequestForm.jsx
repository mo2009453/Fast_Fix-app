
    import React from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
    import { Button } from '@/components/ui/button.jsx';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
    import { Textarea } from '@/components/ui/textarea.jsx';
    import { Label } from '@/components/ui/label.jsx';
    import { Wrench as ToolIcon, AlertTriangle, CircleDollarSign } from 'lucide-react';

    const MaintenanceRequestForm = ({
      maintenanceRequest,
      onFieldChange,
      onSubmit,
      isLoading,
      t,
      deviceTypes,
      visitFee
    }) => {
      return (
        <Card className="mb-8 shadow-lg glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-2xl text-primary flex items-center">
              <ToolIcon className="ltr:mr-2 rtl:ml-2" /> {t('createMaintenanceRequest')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deviceType">{t('deviceType')}</Label>
              <Select
                value={maintenanceRequest.deviceType}
                onValueChange={(value) => onFieldChange('deviceType', value)}
              >
                <SelectTrigger id="deviceType" className="w-full bg-background/70">
                  <SelectValue placeholder={t('selectDeviceType')} />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{t(type.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="issueDescription">{t('issueDescription')}</Label>
              <Textarea
                id="issueDescription"
                value={maintenanceRequest.issueDescription}
                onChange={(e) => onFieldChange('issueDescription', e.target.value)}
                placeholder={t('describeTheIssue')}
                className="bg-background/70"
              />
            </div>
            <div className="flex items-center p-3 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
              <AlertTriangle className="h-5 w-5 text-yellow-500 ltr:mr-2 rtl:ml-2" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('visitFeeInfo')}</p>
            </div>
            <Button onClick={onSubmit} disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground text-lg py-3">
              {isLoading ? t('loading') : <><CircleDollarSign className="ltr:mr-2 rtl:ml-2 h-5 w-5" /> {t('confirmRequest')}</>}
            </Button>
          </CardContent>
        </Card>
      );
    };

    export default MaintenanceRequestForm;
  